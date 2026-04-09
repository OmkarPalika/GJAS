import { ChromaClient } from 'chromadb';
import dotenv from 'dotenv';

dotenv.config();

async function checkCount() {
  const client = new ChromaClient({
    host: process.env.CHROMA_URL ? new URL(process.env.CHROMA_URL).hostname : 'localhost',
    port: process.env.CHROMA_URL ? parseInt(new URL(process.env.CHROMA_URL).port) : 8000
  });

  try {
    const collection = await client.getCollection({ name: "gjas_legal_docs" });
    const count = await collection.count();
    console.log(`📈 Current ChromaDB document count: ${count}`);
    
    if (count === 0) {
      console.warn("⚠️ Warning: Collection is empty. Run 'npm run migrate:chroma' to populate it.");
    }
  } catch (error) {
    console.error("❌ Error connecting to ChromaDB:", error);
  }
}

checkCount();
