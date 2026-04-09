import express from 'express';
import { MistralAIEmbeddings } from '@langchain/mistralai';
import fs from 'fs';
import path from 'path';
import rateLimit from 'express-rate-limit';
import NodeCache from 'node-cache';
import {
  CourtHierarchy,
  RagResult,
  PerspectiveAnalysis,
  Recommendation
} from '@/types/index.js';
import vectorDBService from '@/services/vector_db.service.js';

// Initialize query cache with 5-minute TTL
const nodeCache = new NodeCache({ stdTTL: 300, checkperiod: 600 });

// Rate limiting for API endpoints
const ragLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

// Cosine similarity is now handled by ChromaDB

// Load court hierarchies
function loadCourtHierarchies(): CourtHierarchy[] {
  try {
    const COURT_HIERARCHIES_PATH = path.join(process.cwd(), 'src', 'data', 'court_hierarchies.json');
    const data = fs.readFileSync(COURT_HIERARCHIES_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading court hierarchies:', error);
    return [];
  }
}

// Enhanced court weight calculation with legal system and cross-jurisdictional factors
function getCourtWeight(countryName: string, legalSystem: string | null = null): number {
  const hierarchies = loadCourtHierarchies();
  const hierarchy = hierarchies.find(h => h.country === countryName);

  if (!hierarchy || hierarchy.courts.length === 0) {
    return 1; // Default weight
  }

  // Get highest court weight
  const highestCourt = hierarchy.courts.find(c => c.level === 1);
  let baseWeight = highestCourt ? highestCourt.weight : 1;

  // Legal system weighting (common law gets slight boost for precedent-based systems)
  const systemWeight = legalSystem === 'common_law' ? 1.1 :
    legalSystem === 'civil_law' ? 1.0 :
      legalSystem === 'islamic_law' ? 1.2 :
        1.0;

  // Cross-jurisdictional authority factor
  const crossJurisdictionalFactor = hierarchy.courts.some(c => c.level === 1 &&
    c.name.toLowerCase().includes('supreme') ||
    c.name.toLowerCase().includes('constitutional')) ? 1.15 : 1.0;

  // Historical precedent factor (older constitutions get slight authority boost)
  const yearMatch = countryName.match(/\d{4}/);
  const constitutionYear = yearMatch ? parseInt(yearMatch[0]) : 1990;
  const historicalFactor = Math.min(1.2, 1.0 + (2024 - constitutionYear) * 0.001);

  return baseWeight * systemWeight * crossJurisdictionalFactor * historicalFactor;
}

// Advanced bias mitigation with multi-perspective analysis
function createBiasMitigationPrompt(query: string, results: RagResult[]): string {
  const legalSystems = [...new Set(results.map(r => r.metadata.legal_system))];
  const countries = results.map(r => r.metadata.country);

  const systemDescriptions: Record<string, string> = {
    'common_law': 'Common law systems emphasize judicial precedent and case law',
    'civil_law': 'Civil law systems rely on codified statutes and comprehensive legal codes',
    'islamic_law': 'Islamic law systems are based on Sharia principles and religious texts',
    'mixed': 'Mixed systems combine elements from multiple legal traditions'
  };

  const perspectives = legalSystems.map(system => {
    return `\n${systemDescriptions[system] || 'Unknown legal system'}: Consider how this perspective would interpret the query.`;
  }).join('');

  return `Analyze the following legal question from multiple jurisdictional perspectives:

Question: ${query}

Relevant constitutional provisions found in: ${countries.join(', ')}

Perspectives to consider:${perspectives}

Provide a balanced analysis that:
1. Identifies potential biases in interpretation
2. Highlights differences between legal traditions
3. Suggests a harmonized approach respecting all perspectives
4. Flags any provisions that might conflict across jurisdictions

Response:`;
}

// Apply weighted voting to results
function applyWeightedVoting(results: RagResult[]): RagResult[] {
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



// Vector store is now in ChromaDB

// Test route to verify router is loaded
router.get('/test', (req, res) => {
  res.json({ status: 'RAG router is loaded' });
});

// Enhanced search with advanced features
router.post('/search', ragLimiter, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Check enhanced cache first
    const cacheKey = `search:${query}`;
    const cachedResults = nodeCache.get(cacheKey);
    if (cachedResults) {
      console.log('Cache hit for query:', query);
      return res.json({
        results: cachedResults,
        cached: true,
        cacheInfo: 'Results served from cache'
      });
    }

    // Generate embedding for the query
    const embeddings = new MistralAIEmbeddings();
    const queryEmbedding = await embeddings.embedQuery(query);

    // Query ChromaDB
    let results: RagResult[] = [];
    try {
      const queryResponse = await vectorDBService.query(queryEmbedding, 20);
      
      // Map ChromaDB results to RagResult
      results = queryResponse.ids[0].map((id: string, i: number) => {
        const metadata = queryResponse.metadatas[0][i];
        const similarity = 1 - (queryResponse.distances?.[0][i] || 0); // Assuming cosine distance
        const courtWeight = getCourtWeight(metadata.country, metadata.legal_system);

        return {
          _id: id,
          text: queryResponse.documents[0][i],
          metadata: metadata,
          similarity: similarity,
          courtWeight: courtWeight,
          legalSystem: metadata.legal_system
        };
      });
    } catch (dbError: any) {
      console.warn('Vector DB offline, skipping document search.', dbError.message);
    }

    // Apply enhanced weighted voting
    const weightedResults = applyWeightedVoting(results);

    // Calculate source diversity score
    const legalSystems = [...new Set(weightedResults.map(r => r.legalSystem))];
    const diversityScore = Math.min(1.0, legalSystems.length / 4); // Normalized to 0-1

    // Return top 5 results with enhanced metadata
    const topResults = weightedResults.slice(0, 5);

    // Create bias mitigation prompt for frontend
    const biasMitigationPrompt = createBiasMitigationPrompt(query, topResults);

    // Cache the enhanced results
    nodeCache.set(cacheKey, topResults);

    res.json({
      results: topResults,
      cached: false,
      diversityScore: diversityScore,
      legalSystemsRepresented: legalSystems,
      biasMitigationPrompt: biasMitigationPrompt,
      metadata: {
        timestamp: new Date().toISOString(),
        resultsCount: topResults.length,
        queryLength: query.length
      }
    });
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

// Advanced multi-perspective analysis endpoint
router.post('/analyze', ragLimiter, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Get search results first
    const searchResponse = await fetch('http://localhost:3001/rag/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    const searchData = await searchResponse.json();

    if (!searchData.results || searchData.results.length === 0) {
      return res.json({
        analysis: 'No relevant constitutional provisions found for this query.',
        perspectives: [],
        recommendations: []
      });
    }

    // Create detailed multi-perspective analysis
    const legalSystems = searchData.legalSystemsRepresented || [];
    const results = searchData.results || [];

    const perspectiveAnalysis: PerspectiveAnalysis[] = legalSystems.map((system: string) => {
      const systemResults = results.filter((r: RagResult) => r.legalSystem === system);
      const systemTexts = systemResults.map((r: RagResult) => r.text).join('\n\n');

      return {
        legalSystem: system,
        relevantProvisions: systemResults.length,
        keyFindings: systemResults.map((r: RagResult) => ({
          country: r.metadata.country,
          courtWeight: r.courtWeight,
          similarity: r.similarity,
          textPreview: r.text.substring(0, 200) + '...'
        })),
        interpretation: getSystemInterpretation(system, query, systemTexts)
      };
    });

    // Generate recommendations
    const recommendations = generateRecommendations(perspectiveAnalysis, query);

    res.json({
      query: query,
      analysisTimestamp: new Date().toISOString(),
      perspectives: perspectiveAnalysis,
      diversityScore: searchData.diversityScore,
      recommendations: recommendations,
      metadata: {
        constitutionsAnalyzed: results.length,
        legalSystemsCovered: legalSystems.length,
        cacheStatus: searchData.cached ? 'cached' : 'fresh'
      }
    });

  } catch (error) {
    console.error('Error in advanced analysis:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function for system-specific interpretation
function getSystemInterpretation(system: string, query: string, texts: string): string {
  const interpretations: Record<string, string> = {
    'common_law': `In common law systems, this query would be analyzed through the lens of judicial precedent. Courts would examine past rulings on similar matters and apply established legal principles. The focus would be on how this query fits within the existing body of case law.`,
    'civil_law': `In civil law systems, this query would be evaluated based on codified statutes and constitutional provisions. The analysis would focus on the literal text of the law and its systematic interpretation within the legal code.`,
    'islamic_law': `In Islamic law systems, this query would be considered in light of Sharia principles and religious texts. The interpretation would emphasize compliance with Islamic jurisprudence and the teachings of the Quran and Hadith.`,
    'mixed': `In mixed legal systems, this query would be analyzed using a combination of approaches. The interpretation would blend elements of common law precedent, civil law codification, and potentially religious or customary law principles.`
  };

  return interpretations[system] || 'This legal system requires specialized analysis that combines multiple interpretive approaches.';
}

// Generate recommendations based on multi-perspective analysis
function generateRecommendations(perspectives: PerspectiveAnalysis[], query: string): Recommendation[] {
  const recommendations = [];

  // Check for consensus
  const hasConsensus = perspectives.every((p: PerspectiveAnalysis) => p.keyFindings.length > 0);
  if (hasConsensus) {
    recommendations.push({
      type: 'consensus',
      message: 'There appears to be consensus across legal systems on this issue.',
      confidence: 'high' as const
    });
  } else {
    recommendations.push({
      type: 'divergence',
      message: 'Different legal systems may interpret this query differently.',
      confidence: 'medium' as const
    });
  }

  // Check diversity
  if (perspectives.length >= 3) {
    recommendations.push({
      type: 'diversity',
      message: 'This analysis benefits from input across multiple legal traditions.',
      confidence: 'high' as const
    });
  }

  // Query-specific recommendations
  if (query.length > 100) {
    recommendations.push({
      type: 'complexity',
      message: 'For complex queries, consider breaking down into smaller, more focused questions.',
      confidence: 'medium' as const
    });
  }

  return recommendations;
}

// Generate response using Mistral API
router.post('/generate', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Generate embedding for the query
    const embeddings = new MistralAIEmbeddings();
    const queryEmbedding = await embeddings.embedQuery(query);

    // Query ChromaDB for top results with graceful fallback for offline Chroma servers
    let results: RagResult[] = [];
    try {
      const queryResponse = await vectorDBService.query(queryEmbedding, 5);
      results = queryResponse.ids[0].map((id: string, i: number) => {
        const metadata = queryResponse.metadatas[0][i];
        const similarity = 1 - (queryResponse.distances?.[0][i] || 0);
        return {
          _id: id,
          text: queryResponse.documents[0][i],
          metadata: metadata,
          similarity: similarity,
          courtWeight: getCourtWeight(metadata.country, metadata.legal_system)
        };
      });
      // Sort by similarity in descending order
      results.sort((a, b) => b.similarity - a.similarity);
    } catch (dbError: any) {
      console.warn('Vector DB offline, proceeding to basic RAG synthesis without local context references.', dbError.message);
    }

    // Get top 3 results
    const topResults = results.slice(0, 3);
    
    // Prepare context for Mistral API
    const context = topResults.map((result: RagResult) => result.text).join('\n\n');

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
          { role: 'user', content: `Context:\n${context || 'No specific constitutional context found.'}\n\nQuery:\n${query}` }
        ]
      })
    });

    const data = await mistralResponse.json();

    if (!data.choices || data.choices.length === 0) {
      console.error('Mistral API Error:', data);
      return res.status(500).json({ 
        error: 'AI Provider Error', 
        details: data.message || 'No response generated from Mistral'
      });
    }

    res.json({
      query,
      context,
      response: data.choices[0].message.content
    });
  } catch (error: any) {
    console.error('Error generating response:', error.message || error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;