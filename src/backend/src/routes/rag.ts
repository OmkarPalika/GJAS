import express from 'express';
import { MistralAIEmbeddings } from '@langchain/mistralai';
import rateLimit from 'express-rate-limit';
import NodeCache from 'node-cache';
import {
  RagResult,
  PerspectiveAnalysis,
  Recommendation
} from '@/types/index.js';
import vectorDBService from '@/services/vector_db.service.js';
import Registry from '@/models/Registry.js';

// Initialize query cache with 5-minute TTL
const nodeCache = new NodeCache({ stdTTL: 300, checkperiod: 600 });

// Rate limiting for API endpoints
const ragLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

// Simple flat court weight by legal system — no DB query needed,
// no historical year regex, no redundant cross-jurisdictional factor.
function getCourtWeight(legalSystem: string | null = null): number {
  const weights: Record<string, number> = {
    common_law: 1.1,
    civil_law: 1.0,
    islamic_law: 1.2,
    mixed: 1.0
  };
  return weights[legalSystem || ''] ?? 1.0;
}

// Multi-perspective prompt framing — prompts the LLM to consider
// multiple legal traditions. Note: this is prompt engineering,
// not a bias detection or measurement pipeline.
function createMultiPerspectivePrompt(query: string, results: RagResult[]): string {
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
1. Identifies potential differences in interpretation across legal traditions
2. Highlights key contrasts between systems
3. Suggests a harmonized approach respecting all perspectives
4. Flags any provisions that might conflict across jurisdictions

Response:`;
}

// Apply weighted scores to results using simple legal-system weights
function applyWeightedVoting(results: RagResult[]): RagResult[] {
  return results.map(result => {
    const courtWeight = getCourtWeight(result.legalSystem);
    return {
      ...result,
      courtWeight,
      weightedSimilarity: result.similarity * courtWeight,
      originalSimilarity: result.similarity
    };
  }).sort((a, b) => b.weightedSimilarity - a.weightedSimilarity);
}

// ─── Core Search Logic (reusable — avoids broken self-HTTP call) ──────────────
interface SearchResult {
  results: RagResult[];
  diversityScore: number;
  legalSystemsRepresented: string[];
  biasMitigationPrompt: string;
  cached: boolean;
}

async function performSearch(query: string): Promise<SearchResult> {
  // Normalize cache key (prevents "Freedom of speech" vs "freedom of speech" misses)
  const cacheKey = `search:${query.toLowerCase().trim()}`;
  const cachedResult = nodeCache.get<SearchResult>(cacheKey);
  if (cachedResult) {
    console.log('Cache hit for query:', query);
    return { ...cachedResult, cached: true };
  }

  const embeddings = new MistralAIEmbeddings();
  const queryEmbedding = await embeddings.embedQuery(query);

  let results: RagResult[] = [];
  try {
    const queryResponse = await vectorDBService.query(queryEmbedding, 20);

    results = queryResponse.ids[0].map((id: string, i: number) => {
      const metadata = queryResponse.metadatas[0][i];
      const similarity = 1 - (queryResponse.distances?.[0][i] || 0);
      const courtWeight = getCourtWeight(metadata.legal_system);

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

  const weightedResults = applyWeightedVoting(results);
  const legalSystems = [...new Set(weightedResults.map(r => r.legalSystem).filter((s): s is string => !!s))];
  const diversityScore = Math.min(1.0, legalSystems.length / 4);
  const topResults = weightedResults.slice(0, 5);
  const multiPerspectivePrompt = createMultiPerspectivePrompt(query, topResults);

  const searchResult: SearchResult = {
    results: topResults,
    diversityScore,
    legalSystemsRepresented: legalSystems,
    biasMitigationPrompt: multiPerspectivePrompt,
    cached: false,
  };

  nodeCache.set(cacheKey, searchResult);
  return searchResult;
}

// ─── Helper functions ─────────────────────────────────────────────────────────

function getSystemInterpretation(system: string, query: string, texts: string): string {
  const interpretations: Record<string, string> = {
    'common_law': `In common law systems, this query would be analyzed through the lens of judicial precedent. Courts would examine past rulings on similar matters and apply established legal principles. The focus would be on how this query fits within the existing body of case law.`,
    'civil_law': `In civil law systems, this query would be evaluated based on codified statutes and constitutional provisions. The analysis would focus on the literal text of the law and its systematic interpretation within the legal code.`,
    'islamic_law': `In Islamic law systems, this query would be considered in light of Sharia principles and religious texts. The interpretation would emphasize compliance with Islamic jurisprudence and the teachings of the Quran and Hadith.`,
    'mixed': `In mixed legal systems, this query would be analyzed using a combination of approaches. The interpretation would blend elements of common law precedent, civil law codification, and potentially religious or customary law principles.`
  };

  return interpretations[system] || 'This legal system requires specialized analysis that combines multiple interpretive approaches.';
}


// ─── Router ───────────────────────────────────────────────────────────────────
const router = express.Router();

// Enhanced search with advanced features
router.post('/search', ragLimiter, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const searchResult = await performSearch(query);

    res.json({
      results: searchResult.results,
      cached: searchResult.cached,
      cacheInfo: searchResult.cached ? 'Results served from cache' : undefined,
      diversityScore: searchResult.diversityScore,
      legalSystemsRepresented: searchResult.legalSystemsRepresented,
      biasMitigationPrompt: searchResult.biasMitigationPrompt,
      metadata: {
        timestamp: new Date().toISOString(),
        resultsCount: searchResult.results.length,
        queryLength: query.length
      }
    });
  } catch (error) {
    console.error('Error searching documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get court hierarchy information
router.get('/court-hierarchy', async (req, res) => {
  try {
    const registries = await Registry.find({}, 'name courts countryCode sys');
    res.json(registries.map(r => ({
      country: r.name,
      legal_system: r.sys,
      courts: r.courts
    })));
  } catch (error) {
    console.error('Error fetching court hierarchies:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get court hierarchy for specific country
router.get('/court-hierarchy/:country', async (req, res) => {
  try {
    const { country } = req.params;
    const decodedCountry = decodeURIComponent(country);
    const registry = await Registry.findOne({ 
      $or: [
        { name: decodedCountry },
        { countryCode: decodedCountry.toUpperCase() }
      ]
    });

    if (registry) {
      res.json({
        country: registry.name,
        legal_system: registry.sys,
        courts: registry.courts
      });
    } else {
      res.status(404).json({ error: 'Court hierarchy not found for this country' });
    }
  } catch (error) {
    console.error('Error fetching court hierarchy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Advanced multi-perspective analysis — calls performSearch() directly (no self-HTTP)
router.post('/analyze', ragLimiter, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const searchData = await performSearch(query);

    if (!searchData.results || searchData.results.length === 0) {
      return res.json({
        analysis: 'No relevant constitutional provisions found for this query.',
        perspectives: [],
        recommendations: []
      });
    }

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

    const recommendations = perspectiveAnalysis.map((p: PerspectiveAnalysis) => ({
      legalSystem: p.legalSystem,
      summary: p.interpretation.slice(0, 120) + '...'
    }));

    res.json({
      query: query,
      analysisTimestamp: new Date().toISOString(),
      perspectives: perspectiveAnalysis,
      diversityScore: searchData.diversityScore,
      perspectives_summary: recommendations,
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

// Generate response using Mistral API (rate-limited)
router.post('/generate', ragLimiter, async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const embeddings = new MistralAIEmbeddings();
    const queryEmbedding = await embeddings.embedQuery(query);

    let results: RagResult[] = [];
    try {
      const queryResponse = await vectorDBService.query(queryEmbedding, 5);
      results = results.map((result: RagResult) => ({
        ...result,
        courtWeight: getCourtWeight(result.metadata.legal_system)
      }));
      results.sort((a, b) => b.similarity - a.similarity);
    } catch (dbError: any) {
      console.warn('Vector DB offline, proceeding to basic RAG synthesis without local context references.', dbError.message);
    }

    const topResults = results.slice(0, 3);
    const context = topResults.map((result: RagResult) => result.text).join('\n\n');

    const biasMitigationPrompt = `
    IMPORTANT: Provide a balanced, neutral response. Consider multiple perspectives.
    Avoid favoring any particular country, legal system, or political viewpoint.
    Base your response solely on the provided constitutional context.
    If the context is insufficient, state that clearly.
    `;

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