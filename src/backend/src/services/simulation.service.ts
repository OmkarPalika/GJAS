/**
 * simulation.service.ts — Orchestration Facade
 *
 * This is the top-level coordinator for the GJAS simulation engine.
 * It delegates to focused sub-services:
 *   - JudicialResolver: individual node resolution, prompts, Clerk verification
 *   - AssemblyService: global assembly, ICC proceedings, executive review
 *   - RequestQueue (shared): rate limiting, backoff, pause/resume/stop
 *
 * This class is responsible for:
 *   1. Phase-level orchestration (which countries need to run, when to advance)
 *   2. Embedding caching (one embedding per case, shared across all nodes)
 *   3. Control interface (pause, resume, stop, resetStaleNodes)
 */
import Case from '@/models/Case.js';
import { MistralAIEmbeddings } from '@langchain/mistralai';
import { GLOBAL_COURT_REGISTRY } from '@/lib/court_registry.js';
import { sharedQueue } from '@/services/simulation/request_queue.js';
import { judicialResolver } from '@/services/simulation/judicial.resolver.js';
import { assemblyService } from '@/services/simulation/assembly.service.js';

export type CourtLevel = 'investigation' | 'trial' | 'appellate' | 'supreme';
export type CountryCode = keyof typeof GLOBAL_COURT_REGISTRY;

class SimulationService {
  private caseEmbeddingCache = new Map<string, number[]>();
  private orchestrationThrottles = new Map<string, boolean>();

  // --- Control Interface ---

  pause() { sharedQueue.pause(); }
  resume() { sharedQueue.resume(); }

  stop(caseId?: string) {
    sharedQueue.reset();
    if (caseId) {
      this.resetStaleNodes(caseId).catch(console.error);
      this.caseEmbeddingCache.delete(caseId);
    }
  }

  /**
   * Clears any nodes stuck in 'deliberating', 'failed', or 'edge_case' state.
   * Called both on stop() and at the start of a new simulation.
   */
  async resetStaleNodes(caseId: string): Promise<void> {
    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) return;

    let modified = false;
    caseDoc.pipelines.forEach((pipeline) => {
      (['investigation', 'trial', 'appellate', 'supreme'] as CourtLevel[]).forEach((level) => {
        const node = pipeline.nodes[level];
        if (node.status === 'deliberating' || node.status === 'failed' || node.status === 'edge_case') {
          node.status = 'pending';
          modified = true;
        }
      });
    });

    if (modified) {
      await caseDoc.save();
      console.log(`[Cleanup] Reset stale nodes for Case ${caseId}`);
    }
  }

  // --- Main Orchestration Loop ---

  async runPipelineNextSteps(caseId: string): Promise<void> {
    // Throttle: prevent thundering-herd re-entries within 500ms window
    if (this.orchestrationThrottles.get(caseId)) return;
    this.orchestrationThrottles.set(caseId, true);
    setTimeout(() => this.orchestrationThrottles.delete(caseId), 500);

    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) throw new Error('Case not found');

    // Ensure facts embedding is cached before dispatching any nodes
    let factsEmbedding = this.caseEmbeddingCache.get(caseId);
    if (!factsEmbedding) {
      const resp = await sharedQueue.enqueue(async () => {
        const embeddings = new MistralAIEmbeddings();
        return embeddings.embedQuery(caseDoc.facts);
      }, undefined, 'util'); // UTIL sector for context retrieval
      if (resp) {
        factsEmbedding = resp;
        this.caseEmbeddingCache.set(caseId, factsEmbedding);
        console.log(`[Cache] Generated and cached embedding for Case ${caseId}`);
      }
    }

    const currentPhase = caseDoc.status as CourtLevel;
    const version = sharedQueue.queueVersion;

    // Only orchestrate valid judicial phases
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

    // Dispatch pending nodes for this phase
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
        console.log(`[Phase Transition] ${currentPhase.toUpperCase()} → ${nextPhase.toUpperCase()}`);
        caseDoc.status = nextPhase;
        await caseDoc.save();
        this.runPipelineNextSteps(caseId).catch(console.error);
      } else if (currentPhase === 'supreme' && caseDoc.status !== 'assembly') {
        console.log(`[Phase Transition] SUPREME → GLOBAL ASSEMBLY`);
        caseDoc.status = 'assembly';
        caseDoc.globalAssembly = { status: 'pending' };
        await caseDoc.save();
        assemblyService.runGlobalAssembly(caseId, factsEmbedding).catch(console.error);
      }
    }
  }
}

export const simulationService = new SimulationService();
export default simulationService;
