import { sharedQueue } from '@/services/simulation/request_queue.js';
import vectorDBService from '@/services/vector_db.service.js';
import { MistralAIEmbeddings } from '@langchain/mistralai';
import type { CountryCode, CourtLevel } from '@/services/simulation.service.js';
import Registry from '@/models/Registry.js';
import { SIMULATION_CONFIG } from '@/config/simulation.config.js';

class CorpusLoaderService {
  /**
   * Centralized helper to ensure we don't re-embed facts multiple times
   */
  private async getEmbedding(facts: string, preComputed?: number[]): Promise<number[]> {
    if (preComputed && preComputed.length > 0) return preComputed;
    
    const embeddings = new MistralAIEmbeddings();
    const result = await sharedQueue.enqueue(
      () => embeddings.embedQuery(facts),
      undefined,
      'util'
    );
    return result as number[];
  }
  /**
   * Retrieves country-specific legal context from Vector DB.
   * Filters specifically for the nation's legal documents using db_query_name.
   */
  async getLegalContext(country: CountryCode, level: CourtLevel, facts: string, preComputedEmbedding?: number[]): Promise<string> {
    const registry = await Registry.findOne({ countryCode: country });
    const queryName = registry?.db_query_name || country;

    try {
      const topicEmbedding = await this.getEmbedding(facts, preComputedEmbedding);
      
      // Precision filtering: search specifically for this country's constitutional/legal docs
      const contextResults = await vectorDBService.query(topicEmbedding, SIMULATION_CONFIG.RAG.TOP_K, { 
        country: { "$contains": queryName } 
      });
      
      if (contextResults && contextResults.documents && (contextResults.documents as any[]).length > 0) {
        return (contextResults.documents as any[][])[0].join('\n\n');
      }
      return await this.getFallbackCorpus(country, level);
    } catch (e) {
      console.warn(`Vector DB precision lookup failed for ${country}. Using fallback search.`);
      return await this.fallbackSearch(facts, country, level, preComputedEmbedding);
    }
  }

  /**
   * Global Assembly Context: Retrieves international law, human rights benchmarks, etc.
   */
  async getGlobalAssemblyContext(facts: string, preComputedEmbedding?: number[]): Promise<string> {
    try {
      const topicEmbedding = await this.getEmbedding(facts, preComputedEmbedding);
      
      // Retrieval for International Law / Comparative standards
      const results = await vectorDBService.query(topicEmbedding, SIMULATION_CONFIG.RAG.TOP_K, { 
        "text": { "$contains": "International" } 
      });

      if (results && results.documents && (results.documents as any[]).length > 0) {
        return (results.documents as any[][])[0].join('\n\n');
      }
      return "Focus on the Universal Declaration of Human Rights and common international norms.";
    } catch (e) {
      return "Focus on the Universal Declaration of Human Rights and common international norms.";
    }
  }

  /**
   * ICC Context: Retrieves Rome Statute and ICC procedure documents.
   */
  async getICCContext(facts: string, preComputedEmbedding?: number[]): Promise<string> {
    try {
      const topicEmbedding = await this.getEmbedding(facts, preComputedEmbedding);
      
      const results = await vectorDBService.query(topicEmbedding, SIMULATION_CONFIG.RAG.TOP_K, { 
        "$or": [
          { "text": { "$contains": "Rome Statute" } },
          { "text": { "$contains": "ICC" } },
          { "document_type": "treaty" }
        ]
      });

      if (results && results.documents && (results.documents as any[]).length > 0) {
        return (results.documents as any[][])[0].join('\n\n');
      }
      return "Apply the principles of the Rome Statute and International Criminal Law.";
    } catch (e) {
      return "Apply the principles of the Rome Statute and International Criminal Law.";
    }
  }

  private async fallbackSearch(facts: string, country: CountryCode, level: CourtLevel, preComputedEmbedding?: number[]): Promise<string> {
    try {
      const topicEmbedding = await this.getEmbedding(facts, preComputedEmbedding);
      const wideResults = await vectorDBService.query(topicEmbedding, 2);
      if (wideResults && wideResults.documents && (wideResults.documents as any[]).length > 0) {
        return (wideResults.documents as any[][])[0].join('\n\n');
      }
    } catch (e) {}
    return await this.getFallbackCorpus(country, level);
  }

  private async getFallbackCorpus(country: CountryCode, level: CourtLevel): Promise<string> {
    const registry = await Registry.findOne({ countryCode: country });
    if (!registry) return 'Rely on general legal principles for this jurisdiction.';

    const sys = registry.sys;
    const court = (registry as any)[level] || `${level} stage`;

    const levelContexts: Record<CourtLevel, string> = {
      investigation: `Reference national criminal procedure for ${country}. Focus on whether the evidence justifies formal charges in the context of a ${sys}.`,
      trial: `Apply national statutes to the facts under the ${sys}. As the ${court}, evaluate the burden of proof.`,
      appellate: `Review for procedural errors or misapplication of law by the lower court. Evaluate the case under ${sys} standards of review.`,
      supreme: `Analyze strictly for constitutional validity or violations of fundamental rights as the ${court}. Use ${sys} constitutional principles.`
    };
    
    return levelContexts[level];
  }
}

export const corpusLoader = new CorpusLoaderService();
export default corpusLoader;
