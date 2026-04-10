import { ChromaClient, Collection, EmbeddingFunction } from 'chromadb';
import * as fs from 'fs';
import { MistralAIEmbeddings } from '@langchain/mistralai';

let _mistralEmbeddings: MistralAIEmbeddings | null = null;

function getMistralEmbeddings() {
  if (!_mistralEmbeddings) {
    if (!process.env.MISTRAL_API_KEY) {
      console.warn('MISTRAL_API_KEY missing from environment. Using zero-vector fallback.');
    }
    _mistralEmbeddings = new MistralAIEmbeddings({
      apiKey: process.env.MISTRAL_API_KEY
    });
  }
  return _mistralEmbeddings;
}

const productionEmbedder: EmbeddingFunction = {
  generate: async (texts: string[]) => {
    try {
      const embeddings = getMistralEmbeddings();
      return await embeddings.embedDocuments(texts);
    } catch (error) {
      console.error('Mistral embedding generation failed:', error);
      // Return zero vectors as a fallback to prevent total system failure, but log loudly
      return texts.map(() => Array(1536).fill(0));
    }
  }
};

class VectorDBService {
  private client: ChromaClient;
  private collection: Collection | null = null;
  private readonly collectionName = 'gjas_legal_docs';
  // Singleton init guard: all concurrent callers share the same promise
  private initPromise: Promise<void> | null = null;

  constructor() {
    let host = 'localhost';
    let port = 8000;
    let ssl = false;
    
    try {
      const url = new URL(process.env.CHROMA_URL || 'http://localhost:8000');
      host = url.hostname;
      port = parseInt(url.port, 10) || 8000;
      ssl = url.protocol === 'https:';
    } catch (error) {
      console.warn('Failed to parse CHROMA_URL, falling back to defaults.');
    }

    this.client = new ChromaClient({ host, port, ssl });
  }

  async initialize(): Promise<void> {
    // If already initialized, skip silently
    if (this.collection) return;
    // If currently initializing, wait on existing promise
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        this.collection = await this.client.getOrCreateCollection({
          name: this.collectionName,
          metadata: { "hnsw:space": "cosine" },
          embeddingFunction: productionEmbedder
        });
        console.log(`Connected to ChromaDB collection: ${this.collectionName}`);
      } catch (error) {
        this.initPromise = null; // Allow retry on next call
        console.error('Failed to initialize ChromaDB:', error);
        throw error;
      }
    })();

    return this.initPromise;
  }

  async addDocuments(ids: string[], embeddings: number[][], metadatas: any[], documents: string[]): Promise<void> {
    if (!this.collection) await this.initialize();
    
    await this.collection!.upsert({
      ids,
      embeddings,
      metadatas,
      documents
    });
  }

  async query(queryEmbedding: number[], nResults: number = 5, where?: any): Promise<any> {
    if (!this.collection) await this.initialize();

    const queryParams: any = {
      queryEmbeddings: [queryEmbedding],
      nResults,
    };

    if (where && Object.keys(where).length > 0) {
      queryParams.where = where;
    }

    return await this.collection!.query(queryParams);
  }

  async migrateFromJson(jsonPath: string): Promise<void> {
    try {
      if (!this.collection) await this.initialize();

      const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      console.log(`Migrating ${data.length} documents from ${jsonPath} to ChromaDB...`);

      const batchSize = 100;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const ids = batch.map((_: any, index: number) => `doc_${i + index}`);
        const embeddings = batch.map((item: any) => item.embedding);
        const metadatas = batch.map((item: any) => {
          const flattened: any = {};
          // Flatten standard metadata and loc info
          if (item.metadata) {
            Object.entries(item.metadata).forEach(([key, value]) => {
              if (typeof value === 'object' && value !== null) {
                flattened[key] = JSON.stringify(value);
              } else {
                flattened[key] = value;
              }
            });
          }
          return flattened;
        });
        const documents = batch.map((item: any) => item.text);

        await this.addDocuments(ids, embeddings, metadatas, documents);
        console.log(`Migrated ${Math.min(i + batchSize, data.length)} / ${data.length} documents`);
      }

      console.log('Migration complete.');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }
}

export const vectorDBService = new VectorDBService();
export default vectorDBService;
