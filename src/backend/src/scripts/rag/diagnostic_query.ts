import { ChromaClient } from 'chromadb';
import dotenv from 'dotenv';
import { MistralAIEmbeddings } from '@langchain/mistralai';

dotenv.config();

async function diagnostic() {
  const client = new ChromaClient({
    host: 'localhost',
    port: 8000
  });

  const embeddings = new MistralAIEmbeddings();
  const query = "freedom of work";
  console.log(`Querying for: "${query}"`);
  
  const queryEmbedding = await embeddings.embedQuery(query);
  console.log(`Query embedding generated (dim: ${queryEmbedding.length})`);

  try {
    const collection = await client.getCollection({ name: "gjas_legal_docs" });
    const response = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: 5
    });
    
    console.log("Raw ChromaDB Response:");
    console.log(JSON.stringify(response, null, 2));
  } catch (error) {
    console.error("Diagnostic failed:", error);
  }
}

diagnostic();
