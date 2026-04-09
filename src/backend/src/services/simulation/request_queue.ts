/**
 * RequestQueue 2.2 — Triple-Sector Orchestrator
 * 
 * Divides the global concurrency pool into dedicated sectors:
 * - LEGAL: Judicial Verdicts (High complexity, 3 reserved slots)
 * - UTIL: Context/Embeddings (High throughput dependency, 5 reserved slots)
 * - BG: Background Monologues (Non-critical UI path, 1 strictly limited slot)
 * 
 * Implements "Slot Releasing" during 429 backoffs to ensure global throughput.
 */
export type QueueSector = 'legal' | 'util' | 'bg';

export class RequestQueue {
  private activeCounts: Record<QueueSector, number> = { legal: 0, util: 0, bg: 0 };
  private maxCounts: Record<QueueSector, number> = {
    legal: 3, // Reserved for critical judicial verdicts
    util: 5,  // Increased specifically to clear the context-retrieval bottleneck
    bg: 1     // Minimally intrusive background tasks
  };

  private waitQueues: Record<QueueSector, (() => void)[]> = {
    legal: [], util: [], bg: []
  };
  
  private lastStartTime = 0;
  private initiationLock: Promise<void> = Promise.resolve();

  readonly minInterval = 1050; // Staggered orchestration
  isPaused = false;
  queueVersion = 0;
  queuedNodes = new Set<string>();

  pause() { this.isPaused = true; }
  resume() { this.isPaused = false; }

  reset() {
    this.isPaused = false;
    this.queueVersion++;
    (Object.keys(this.activeCounts) as QueueSector[]).forEach(s => {
      this.activeCounts[s] = 0;
      this.waitQueues[s].forEach(rv => rv());
      this.waitQueues[s] = [];
    });
    this.queuedNodes.clear();
  }

  async enqueue<T>(
    req: () => Promise<T>, 
    onTokenAcquired?: () => Promise<void>,
    sector: QueueSector = 'bg'
  ): Promise<T | null> {
    const version = this.queueVersion;

    // 1. Sector-Based Concurrency Control
    const acquireSocket = async () => {
      if (this.activeCounts[sector] >= this.maxCounts[sector]) {
        await new Promise<void>(resolve => this.waitQueues[sector].push(resolve));
      }
      this.activeCounts[sector]++;
    };

    const releaseSocket = () => {
      this.activeCounts[sector]--;
      const next = this.waitQueues[sector].shift();
      if (next) next();
    };

    await acquireSocket();
    if (version !== this.queueVersion) { releaseSocket(); return null; }

    try {
      // 2. Strict Initiation Lock (1.05s stagger logic)
      await this.initiationLock;
      const now = Date.now();
      const delay = Math.max(0, this.minInterval - (now - this.lastStartTime));
      this.initiationLock = (async () => {
        if (delay > 0) await new Promise(r => setTimeout(r, delay));
        this.lastStartTime = Date.now();
      })();
      await this.initiationLock;

      if (onTokenAcquired) await onTokenAcquired();
      if (version !== this.queueVersion) return null;

      // 3. Execution with Resilience (Releases slot while waiting)
      return await this.executeSectorResilient(req, version, acquireSocket, releaseSocket);
    } finally {
      releaseSocket();
    }
  }

  private async executeSectorResilient<T>(
    req: () => Promise<T>, 
    version: number,
    acquire: () => Promise<void>,
    release: () => void
  ): Promise<T | null> {
    const MAX_RETRIES = 5;
    const BASE_DELAY_MS = 10_000;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await req();

        if (result && (result as any).status === 429) {
          const backoff = BASE_DELAY_MS * Math.pow(2, attempt);
          const capped = Math.min(backoff, 60_000); 

          console.warn(`[Queue|429] Sector limit hit. Releasing slot and backing off ${capped/1000}s...`);
          
          release();
          await new Promise(r => setTimeout(r, capped));
          await acquire();
          
          if (version !== this.queueVersion) return null;
          continue;
        }
        return result;
      } catch (err: any) {
        if (err?.name === 'AbortError') return null;
        const retryDelay = Math.min(BASE_DELAY_MS * Math.pow(2, attempt), 20000);
        console.error(`[Queue|Error] ${err?.message}. Retrying in ${retryDelay/1000}s...`);
        release();
        await new Promise(r => setTimeout(r, retryDelay));
        await acquire();
        if (version !== this.queueVersion) return null;
      }
    }
    return null;
  }

  static robustJsonParse(text: string): any {
    try {
      return JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
         try { return JSON.parse(jsonMatch[0]); } catch { return null; }
      }
      return null;
    }
  }
}

export const sharedQueue = new RequestQueue();
