/**
 * RequestQueue — Simple Semaphore + Exponential Backoff
 *
 * Replaces the previous over-engineered 3-sector design with a clean
 * concurrency-limited queue. Mistral's API handles its own rate limits;
 * we only need to cap parallel in-flight requests and retry on failure.
 */

export class RequestQueue {
  private activeCount = 0;
  private readonly maxConcurrent = 8; // Total parallel Mistral calls
  private waitQueue: (() => void)[] = [];

  isPaused = false;
  queueVersion = 0;
  queuedNodes = new Set<string>();

  pause() { this.isPaused = true; }
  resume() { this.isPaused = false; this.flush(); }

  reset() {
    this.isPaused = false;
    this.queueVersion++;
    this.activeCount = 0;
    this.waitQueue.forEach(r => r());
    this.waitQueue = [];
    this.queuedNodes.clear();
  }

  private flush() {
    while (this.waitQueue.length > 0 && this.activeCount < this.maxConcurrent) {
      const next = this.waitQueue.shift();
      if (next) next();
    }
  }

  private async acquireSlot(): Promise<void> {
    if (this.activeCount < this.maxConcurrent) {
      this.activeCount++;
      return;
    }
    await new Promise<void>(resolve => this.waitQueue.push(resolve));
    this.activeCount++;
  }

  private releaseSlot(): void {
    this.activeCount--;
    const next = this.waitQueue.shift();
    if (next) next();
  }

  async enqueue<T>(
    req: () => Promise<T>,
    onTokenAcquired?: () => Promise<void>,
    _sector?: string // kept for API compatibility — sector concept removed
  ): Promise<T | null> {
    const version = this.queueVersion;

    await this.acquireSlot();
    if (version !== this.queueVersion) { this.releaseSlot(); return null; }

    try {
      if (onTokenAcquired) await onTokenAcquired();
      if (version !== this.queueVersion) return null;

      return await this.executeWithRetry(req, version);
    } finally {
      this.releaseSlot();
    }
  }

  private async executeWithRetry<T>(req: () => Promise<T>, version: number): Promise<T | null> {
    const MAX_RETRIES = 5;
    const BASE_DELAY_MS = 10_000;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await req();

        if (result && (result as any).status === 429) {
          const backoff = Math.min(BASE_DELAY_MS * Math.pow(2, attempt), 60_000);
          console.warn(`[Queue|429] Rate limited. Backing off ${backoff / 1000}s...`);
          await new Promise(r => setTimeout(r, backoff));
          if (version !== this.queueVersion) return null;
          continue;
        }

        return result;
      } catch (err: any) {
        if (err?.name === 'AbortError') return null;
        const retryDelay = Math.min(BASE_DELAY_MS * Math.pow(2, attempt), 20_000);
        console.error(`[Queue|Error] ${err?.message}. Retrying in ${retryDelay / 1000}s...`);
        await new Promise(r => setTimeout(r, retryDelay));
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

// Kept for import compatibility — sector type no longer has meaning
export type QueueSector = string;
