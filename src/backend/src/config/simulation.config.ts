/**
 * simulation.config.ts
 * Centralized configuration for the Global Judicial Assembly Simulator.
 */

export const SIMULATION_CONFIG = {
  // LLM API Settings
  MISTRAL_API_URL: 'https://api.mistral.ai/v1/chat/completions',
  MISTRAL_EMBED_URL: 'https://api.mistral.ai/v1/embeddings',
  
  // Model Identifiers
  MODELS: {
    JUDICIAL: 'mistral-small-latest',    // Efficient for 195 nations
    ANALYSIS: 'mistral-medium-latest',   // Deep synthesis
    GLOBAL_ASSEMBLY: 'mistral-large-latest', // Maximum reasoning context
    CLERK: 'mistral-small-latest'        // Structural verification
  },

  // Orchestration Timeouts
  TIMEOUTS: {
    NODE_STALL_THRESHOLD_MS: 300000, // 5 Minutes
    WS_HEARTBEAT_INTERVAL_MS: 30000  // 30 Seconds
  },

  // Scaling Thresholds
  SCALING: {
    BLOCK_SUMMARIZATION_THRESHOLD: 30, // Consolidate verdicts beyond 30 nations
  },

  // RAG Settings
  RAG: {
    TOP_K: 5
  },

  // Feature Flags
  FEATURES: {
    /**
     * ENABLE_MONOLOGUE: streams a "thinking log" per judicial node.
     * Cost: 1 extra LLM call × 198 nations × 4 levels = 792 extra API calls/simulation.
     * Default: false. Set ENABLE_MONOLOGUE=true in .env to activate.
     */
    ENABLE_MONOLOGUE: process.env.ENABLE_MONOLOGUE === 'true'
  }
};
