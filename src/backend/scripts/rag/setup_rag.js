import { MongoClient } from 'mongodb';
import { MistralAIEmbeddings } from '@langchain/mistralai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import path from 'path';
import fs from 'fs';

const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'gjas';
const COLLECTION_NAME = 'constitutions';
const VECTOR_STORE_PATH = path.join(process.cwd(), '..', 'data', 'vector_store.json');

async function setupRAG() {
  let client;
  try {
    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    const constitutions = await db.collection(COLLECTION_NAME).find({}).toArray();

    // Prepare documents for embedding
    const documents = constitutions.map(con => ({
      pageContent: con.text,
      metadata: { country: con.country, fileName: con.fileName }
    }));

    // Split documents into smaller chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500, // Reduce chunk size
      chunkOverlap: 100,
    });
    const splits = await textSplitter.splitDocuments(documents);

    // Generate embeddings for each chunk
    const embeddings = new MistralAIEmbeddings();
    const vectorStore = [];

    // Process documents in batches to avoid token limits
    // Process all constitutions with diversity
    const batchSize = 3;
    const maxDocuments = 199;
    
    // Track which constitutions we've processed to ensure diversity
    const processedConstitutions = new Set();
    const diverseSplits = [];
    
    for (const split of splits) {
      const countryKey = split.metadata.country + split.metadata.fileName;
      if (!processedConstitutions.has(countryKey)) {
        diverseSplits.push(split);
        processedConstitutions.add(countryKey);
        if (diverseSplits.length >= maxDocuments) {
          break;
        }
      }
    }
    
    console.log(`Processing ${diverseSplits.length} diverse documents from ${processedConstitutions.size} constitutions`);
    
    for (let i = 0; i < diverseSplits.length; i += batchSize) {
      const batch = diverseSplits.slice(i, i + batchSize);
      const batchEmbeddings = await embeddings.embedDocuments(
        batch.map(doc => doc.pageContent)
      );

      for (let j = 0; j < batch.length; j++) {
        vectorStore.push({
          embedding: batchEmbeddings[j],
          text: batch[j].pageContent,
          metadata: batch[j].metadata
        });
      }

      console.log(`Processed batch ${i} to ${Math.min(i + batchSize, diverseSplits.length)} (${processedConstitutions.size} constitutions)`);
      
      // Add delay between batches to avoid rate limiting
      if (i + batchSize < diverseSplits.length) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }
    }

    // Save the vector store to disk
    fs.writeFileSync(VECTOR_STORE_PATH, JSON.stringify(vectorStore, null, 2));

    console.log('RAG setup complete!');
  } catch (error) {
    console.error('Error setting up RAG:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

setupRAG();