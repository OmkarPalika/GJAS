import express from 'express';
import { MistralAIEmbeddings } from '@langchain/mistralai';
import fs from 'fs';
import path from 'path';

// Simple cosine similarity function
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }
  
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);
  
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }
  
  return dotProduct / (magnitudeA * magnitudeB);
}

// Load court hierarchies
function loadCourtHierarchies() {
  try {
    const COURT_HIERARCHIES_PATH = path.join(process.cwd(), 'data', 'court_hierarchies.json');
    const data = fs.readFileSync(COURT_HIERARCHIES_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading court hierarchies:', error);
    return [];
  }
}

// Get court weight for a country
function getCourtWeight(countryName) {
  const hierarchies = loadCourtHierarchies();
  const hierarchy = hierarchies.find(h => h.country === countryName);
  if (hierarchy && hierarchy.courts.length > 0) {
    // Return the highest court weight (level 1)
    const highestCourt = hierarchy.courts.find(c => c.level === 1);
    return highestCourt ? highestCourt.weight : 1;
  }
  return 1; // Default weight
}

// Apply weighted voting to results
function applyWeightedVoting(results) {
  return results.map(result => {
    const courtWeight = getCourtWeight(result.metadata.country);
    const weightedSimilarity = result.similarity * courtWeight;
    
    return {
      ...result,
      courtWeight,
      weightedSimilarity,
      originalSimilarity: result.similarity
    };
  }).sort((a, b) => b.weightedSimilarity - a.weightedSimilarity);
}

const router = express.Router();
const VECTOR_STORE_PATH = path.join(process.cwd(), '..', 'data', 'vector_store.json');

// Simple in-memory cache for frequent queries
const queryCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache management function
function getFromCache(query) {
  const cached = queryCache.get(query);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setInCache(query, data) {
  queryCache.set(query, {
    data,
    timestamp: Date.now()
  });
  // Limit cache size
  if (queryCache.size > 100) {
    const oldestKey = queryCache.keys().next().value;
    queryCache.delete(oldestKey);
  }
}

// Load the vector store
function loadVectorStore() {
  try {
    const data = fs.readFileSync(VECTOR_STORE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading vector store:', error);
    return [];
  }
}

// Test route to verify router is loaded
router.get('/test', (req, res) => {
  res.json({ status: 'RAG router is loaded' });
});

// Search for relevant documents
router.post('/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Check cache first
    const cachedResults = getFromCache(query);
    if (cachedResults) {
      console.log('Cache hit for query:', query);
      return res.json(cachedResults);
    }

    // Load the vector store
    const vectorStore = loadVectorStore();
    if (vectorStore.length === 0) {
      return res.status(500).json({ error: 'Vector store is empty' });
    }

    // Generate embedding for the query
    const embeddings = new MistralAIEmbeddings();
    const queryEmbedding = await embeddings.embedQuery(query);

    // Calculate cosine similarity between query and each document
    const results = vectorStore.map(item => {
      const similarity = cosineSimilarity(queryEmbedding, item.embedding);
      console.log('Similarity:', similarity); // Debug log
      return {
        ...item,
        similarity: similarity
      };
    });

    // Apply weighted voting based on court hierarchy
    const weightedResults = applyWeightedVoting(results);
    console.log('Weighted results:', weightedResults); // Debug log

    // Return top 5 results (now weighted)
    const topResults = weightedResults.slice(0, 5);

    // Cache the results
    setInCache(query, topResults);
    
    res.json(topResults);
  } catch (error) {
    console.error('Error searching documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get court hierarchy information
router.get('/court-hierarchy', (req, res) => {
  try {
    const hierarchies = loadCourtHierarchies();
    res.json(hierarchies);
  } catch (error) {
    console.error('Error fetching court hierarchies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get court hierarchy for specific country
router.get('/court-hierarchy/:country', (req, res) => {
  try {
    const { country } = req.params;
    const hierarchies = loadCourtHierarchies();
    const hierarchy = hierarchies.find(h => h.country === decodeURIComponent(country));
    
    if (hierarchy) {
      res.json(hierarchy);
    } else {
      res.status(404).json({ error: 'Court hierarchy not found for this country' });
    }
  } catch (error) {
    console.error('Error fetching court hierarchy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate response using Mistral API
router.post('/generate', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Load the vector store
    const vectorStore = loadVectorStore();
    if (vectorStore.length === 0) {
      return res.status(500).json({ error: 'Vector store is empty' });
    }

    // Generate embedding for the query
    const embeddings = new MistralAIEmbeddings();
    const queryEmbedding = await embeddings.embedQuery(query);

    // Calculate cosine similarity between query and each document
    const results = vectorStore.map(item => ({
      ...item,
      similarity: cosineSimilarity(queryEmbedding, item.embedding)
    }));

    // Sort by similarity in descending order
    results.sort((a, b) => b.similarity - a.similarity);

    // Get top 3 results
    const topResults = results.slice(0, 3);

    // Prepare context for Mistral API
    const context = topResults.map(result => result.text).join('\n\n');

    // Basic bias mitigation: Add instructions to be neutral and balanced
    const biasMitigationPrompt = `
    IMPORTANT: Provide a balanced, neutral response. Consider multiple perspectives.
    Avoid favoring any particular country, legal system, or political viewpoint.
    Base your response solely on the provided constitutional context.
    If the context is insufficient, state that clearly.
    `;
    
    // Generate response using Mistral API
    const mistralResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
      },
      body: JSON.stringify({
        model: 'mistral-tiny',
        messages: [
          { role: 'system', content: `You are a neutral legal assistant. ${biasMitigationPrompt}` },
          { role: 'user', content: `Context:\n${context}\n\nQuery:\n${query}` }
        ]
      })
    });

    const data = await mistralResponse.json();

    res.json({
      query,
      context,
      response: data.choices[0].message.content
    });
  } catch (error) {
    console.error('Error generating response:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;