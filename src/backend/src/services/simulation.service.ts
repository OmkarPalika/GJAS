/**
 * simulation.service.ts — Orchestration Facade
 *
 * Lock strategy: simple in-memory Set<string> per caseId.
 * MongoDB distributed locking removed — GJAS runs as a single Node.js
 * process. A distributed lock for a single process adds network
 * round-trips with zero benefit.
 */
import Case from '@/models/Case.js';
import { MistralAIEmbeddings } from '@langchain/mistralai';
import { sharedQueue } from '@/services/simulation/request_queue.js';
import { judicialResolver } from '@/services/simulation/judicial.resolver.js';
import { assemblyService } from '@/services/simulation/assembly.service.js';
import { getWsServer } from '@/services/websocket.js';
import { SIMULATION_CONFIG } from '@/config/simulation.config.js';

export type CourtLevel = 'investigation' | 'trial' | 'appellate' | 'supreme';
export type CountryCode = string;

// In-memory lock — one entry per actively orchestrating caseId
const activeLocks = new Set<string>();

class SimulationService {
  private caseEmbeddingCache = new Map<string, number[]>();

  // ── In-memory lock (replaces MongoDB Lock model) ──────────────────────────
  private acquireSimulationLock(caseId: string): boolean {
    if (activeLocks.has(caseId)) return false;
    activeLocks.add(caseId);
    return true;
  }

  private releaseSimulationLock(caseId: string): void {
    activeLocks.delete(caseId);
  }

  constructor() {
    // Watchdog: periodically recover stalled simulations
    setInterval(() => {
      this.checkStalledSimulations().catch(err => console.error('[Watchdog] Error:', err));
    }, SIMULATION_CONFIG.TIMEOUTS.WS_HEARTBEAT_INTERVAL_MS);
  }

  private async checkStalledSimulations(): Promise<void> {
    const stallTime = new Date(Date.now() - SIMULATION_CONFIG.TIMEOUTS.NODE_STALL_THRESHOLD_MS);
    const stalledCases = await Case.find({
      status: { $nin: ['complete', 'failed'] },
      updatedAt: { $lt: stallTime }
    });

    for (const caseDoc of stalledCases) {
      console.log(`[Watchdog] Case ${caseDoc._id} appears stalled. Pinging orchestration...`);
      this.runPipelineNextSteps(caseDoc._id.toString()).catch(() => {});
    }
  }

  // --- Control Interface ---

  pause() { sharedQueue.pause(); }
  resume() { sharedQueue.resume(); }

  stop(caseId?: string) {
    sharedQueue.reset();
    if (caseId) {
      this.resetStaleNodes(caseId).catch(console.error);
      this.caseEmbeddingCache.delete(caseId);
      this.releaseSimulationLock(caseId);
    }
  }

  async resetStaleNodes(caseId: string): Promise<void> {
    const result = await Case.updateMany(
      {
        _id: caseId,
        $or: [
          { 'pipelines.$[].nodes.investigation.status': { $in: ['deliberating', 'failed', 'edge_case'] } },
          { 'pipelines.$[].nodes.trial.status': { $in: ['deliberating', 'failed', 'edge_case'] } },
          { 'pipelines.$[].nodes.appellate.status': { $in: ['deliberating', 'failed', 'edge_case'] } },
          { 'pipelines.$[].nodes.supreme.status': { $in: ['deliberating', 'failed', 'edge_case'] } }
        ]
      },
      {
        $set: {
          'pipelines.$[].nodes.investigation.status': 'pending',
          'pipelines.$[].nodes.trial.status': 'pending',
          'pipelines.$[].nodes.appellate.status': 'pending',
          'pipelines.$[].nodes.supreme.status': 'pending'
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`[Cleanup] Reset ${result.modifiedCount} stale nodes for Case ${caseId}`);
    }
  }

  // --- Main Orchestration Loop ---

  async runPipelineNextSteps(caseId: string): Promise<void> {
    // ── IN-MEMORY LOCK ──
    const acquired = this.acquireSimulationLock(caseId);
    if (!acquired) return;

    try {
      const caseDoc = await Case.findById(caseId);
      if (!caseDoc) throw new Error('Case not found');

      // Cache facts embedding to avoid re-embedding per node
      let factsEmbedding = this.caseEmbeddingCache.get(caseId);
      if (!factsEmbedding) {
        const resp = await sharedQueue.enqueue(async () => {
          const embeddings = new MistralAIEmbeddings();
          return embeddings.embedQuery(caseDoc.facts);
        });
        if (resp) {
          factsEmbedding = resp;
          this.caseEmbeddingCache.set(caseId, factsEmbedding);
          console.log(`[Cache] Generated and cached embedding for Case ${caseId}`);
        }
      }

      const currentPhase = caseDoc.status as CourtLevel;
      const version = sharedQueue.queueVersion;

      if (!(['investigation', 'trial', 'appellate', 'supreme'] as string[]).includes(currentPhase)) return;
      if (sharedQueue.queueVersion !== version) return;

      const countries = Array.from(caseDoc.pipelines.keys()) as CountryCode[];
      let completedInPhase = 0;
      const workItems: { country: CountryCode; nodeLevel: CourtLevel }[] = [];

      for (const country of countries) {
        const pipeline = caseDoc.pipelines.get(country)!;
        const node = pipeline.nodes[currentPhase];
        const nodeId = `${country}-${currentPhase}`;

        if (node.status === 'complete' || node.status === 'failed') {
          completedInPhase++;
        } else if (node.status !== 'deliberating' && node.status !== 'edge_case' && !judicialResolver.queue.queuedNodes.has(nodeId)) {
          workItems.push({ country, nodeLevel: currentPhase });
        }
      }

      if (workItems.length > 0) {
        console.log(`[Orchestrator] Dispatching ${workItems.length} nodes for ${currentPhase.toUpperCase()} phase...`);
      }

      // Dispatch pending nodes
      for (const item of workItems) {
        const nodeId = `${item.country}-${item.nodeLevel}`;
        judicialResolver.resolveNode(caseId, item.country, item.nodeLevel, factsEmbedding)
          .then(() => {
            if (sharedQueue.queueVersion === version) {
              this.runPipelineNextSteps(caseId);
            }
          })
          .catch(async (err) => {
            console.error(`[Orchestrator] Node ${item.country}-${item.nodeLevel} failed:`, err);
            judicialResolver.queue.queuedNodes.delete(nodeId);
            await Case.updateOne(
              { _id: caseId },
              { $set: { [`pipelines.${item.country}.nodes.${item.nodeLevel}.status`]: 'failed' } }
            );
          });
      }

      // Phase gate: all nations must finish before advancing
      if (completedInPhase === countries.length) {
        const phases: CourtLevel[] = ['investigation', 'trial', 'appellate', 'supreme'];
        const currentIndex = phases.indexOf(currentPhase);

        if (currentIndex < phases.length - 1) {
          const nextPhase = phases[currentIndex + 1];

          const transitioned = await Case.findOneAndUpdate(
            { _id: caseId, status: currentPhase },
            { $set: { status: nextPhase } }
          );

          if (transitioned) {
            console.log(`[Phase Transition] ${currentPhase.toUpperCase()} → ${nextPhase.toUpperCase()}`);

            try {
              getWsServer().broadcastCaseUpdate(caseId, {
                status: nextPhase,
                event: 'PHASE_TRANSITION',
                timestamp: new Date()
              });
            } catch (wsErr) {
              console.warn('[WS] Broadcast failed:', wsErr);
            }

            this.releaseSimulationLock(caseId);
            setImmediate(() => this.runPipelineNextSteps(caseId).catch(console.error));
            return;
          }

        } else if (currentPhase === 'supreme') {
          const assembled = await Case.findOneAndUpdate(
            { _id: caseId, status: 'supreme' },
            { $set: { status: 'assembly', 'globalAssembly.status': 'pending' } }
          );

          if (assembled) {
            console.log(`[Phase Transition] SUPREME → GLOBAL ASSEMBLY`);

            try {
              getWsServer().broadcastCaseUpdate(caseId, {
                status: 'assembly',
                event: 'GLOBAL_ASSEMBLY_START',
                timestamp: new Date()
              });
            } catch (wsErr) {
              console.warn('[WS] Broadcast failed:', wsErr);
            }

            assemblyService.runGlobalAssembly(caseId, factsEmbedding).catch(console.error);
          }
        }
      }
    } finally {
      this.releaseSimulationLock(caseId);

      // Safety: retry once after lock release in case a node finished while we held the lock
      setImmediate(async () => {
        if (!activeLocks.has(caseId)) {
          this.runPipelineNextSteps(caseId).catch(() => {});
        }
      });
    }
  }
}

export const simulationService = new SimulationService();
export default simulationService;
