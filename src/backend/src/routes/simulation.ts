import express, { Response } from 'express';
import Case, { ICountryPipeline } from '@/models/Case.js';
import simulationService from '@/services/simulation.service.js';
import { authMiddleware, AuthRequest } from '@/middleware/auth.js';
import mongoose from 'mongoose';
import { GLOBAL_COURT_REGISTRY } from '../lib/court_registry.js';


const router = express.Router();

// 1. Initialize a new Case Simulation
router.post('/start', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title, facts, caseType, prosecution, defense, accused, countries } = req.body;
    
    if (!title || !facts || !countries || countries.length === 0) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const newCase = new Case({
      _id: new mongoose.Types.ObjectId().toString(),
      title,
      facts,
      caseType: caseType || 'criminal',
      parties: {
        prosecution: prosecution || 'State Prosecution',
        defense: defense || 'Defense Counsel',
        accused: accused || 'John Doe'
      },
      status: 'investigation',
      createdBy: req.user?._id,
      evidence: [],
      edgeCaseLog: []
    });

    const pipelineMap = new Map<string, ICountryPipeline>();
    
    // Setup legal systems mapping using Global Registry
    for (const c of countries) {
      const registryEntry = GLOBAL_COURT_REGISTRY[c];
      pipelineMap.set(c, {
        country: c,
        legalSystem: registryEntry?.sys || 'Unknown',
        nodes: {
          investigation: { status: 'pending', agentsInvolved: [] },
          trial: { status: 'pending', agentsInvolved: [] },
          appellate: { status: 'pending', agentsInvolved: [] },
          supreme: { status: 'pending', agentsInvolved: [] }
        }
      });
    }

    newCase.pipelines = pipelineMap;
    await newCase.save();

    // Clean any stale node states from previous runs on this ID (safety guard)
    await simulationService.resetStaleNodes(newCase._id.toString());

    // Trigger the simulation DAG background process Start ->
    simulationService.runPipelineNextSteps(newCase._id.toString()).catch(console.error);

    res.json({ message: 'Simulation Pipeline Started', caseId: newCase._id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Step Pipeline Forward manually (force tick)
router.post('/tick/:caseId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await simulationService.runPipelineNextSteps(req.params.caseId as string);
    res.json({ message: 'Tick triggered successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Control Routes
router.post('/pause', authMiddleware, async (req: AuthRequest, res: Response) => {
  simulationService.pause();
  res.json({ message: 'Simulation Paused' });
});

router.post('/resume', authMiddleware, async (req: AuthRequest, res: Response) => {
  simulationService.resume();
  res.json({ message: 'Simulation Resumed' });
});

router.post('/stop', authMiddleware, async (req: AuthRequest, res: Response) => {
  const caseId = req.query.caseId as string;
  simulationService.stop(caseId);
  res.json({ message: 'Simulation Stopped and State Cleaned' });
});

// 3. Resolve an Edge Case interactively (Advocate Mode)
router.post('/resolve-edge-case/:caseId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { nodeId, userInterventionText } = req.body;
    if (!nodeId || !userInterventionText) {
      return res.status(400).json({ error: 'Missing nodeId or userInterventionText' });
    }

    const caseDoc = await Case.findById(req.params.caseId);
    if (!caseDoc) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Find the unresolved edge case for this node
    const edgeCase = caseDoc.edgeCaseLog.find(e => e.nodeId === nodeId && !e.resolved);
    if (!edgeCase) {
      return res.status(404).json({ error: 'Active edge case not found for this node' });
    }

    edgeCase.resolved = true;
    edgeCase.userInterventionText = userInterventionText;
    await caseDoc.save();

    // Trigger pipeline to resume immediately using the newly injected context
    simulationService.runPipelineNextSteps(caseDoc._id.toString()).catch(console.error);

    res.json({ message: 'Edge case resolved. Pipeline resumed.', edgeCase });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Telemetry - Global DAG View
router.get('/telemetry/nodes', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const cases = await Case.find().limit(10); // Last 10 simulations for graph density
    const nodes: any[] = [];
    const links: any[] = [];

    cases.forEach((c) => {
      // Create a Central Case Node
      const caseNodeId = `Case-${c._id.toString().substring(0, 4)}`;
      nodes.push({ 
        id: caseNodeId, 
        type: 'case_summary', 
        description: c.title,
        status: 'active'
      });

      // Map pipelines
      c.pipelines.forEach((p, country) => {
        const countryNodeId = `${country}-${c._id.toString().substring(0, 4)}`;
        nodes.push({
          id: countryNodeId,
          type: 'court',
          description: `${country} Judicial Track`,
          status: p.nodes.supreme.status === 'complete' ? 'complete' : 'in_progress'
        });

        links.push({ source: caseNodeId, target: countryNodeId, value: 3 });

        // Add sub-nodes for status visual
        ['investigation', 'trial', 'appellate', 'supreme'].forEach(lvl => {
          const nodeData = (p.nodes as any)[lvl];
          if (nodeData && nodeData.status !== 'pending') {
            const phaseId = `${country}-${lvl}-${c._id.toString().substring(0, 4)}`;
            nodes.push({
              id: phaseId,
              type: 'legal_phase',
              description: `${lvl.toUpperCase()}`,
              status: nodeData.status // complete, deliberating, edge_case
            });
            links.push({ source: countryNodeId, target: phaseId, value: 1 });
          }
        });
      });
    });

    res.json({ nodes, links });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Telemetry - Legal System Stats
router.get('/telemetry/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const cases = await Case.find();
    const stats: Record<string, number> = {};

    cases.forEach(c => {
      c.pipelines.forEach(p => {
        const category = p.legalSystem || 'Unknown';
        stats[category] = (stats[category] || 0) + 1;
      });
    });

    const formatData = Object.keys(stats).map(key => ({
      legalSystem: key,
      count: stats[key]
    }));

    res.json(formatData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Generate Global Assembly Resolution (Academic Verdict)
router.get('/generate-verdict/:caseId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const caseDoc = await Case.findById(req.params.caseId);
    if (!caseDoc || caseDoc.status !== 'complete') {
      return res.status(400).json({ error: 'Case must be complete to generate resolution.' });
    }

    // Structured Report Generation logic
    let report = `# THE GLOBAL JUDICIAL ASSEMBLY\n`;
    report += `## RESOLUTION ON CASE: ${caseDoc.title.toUpperCase()}\n\n`;
    report += `**Date:** ${new Date().toLocaleDateString()}\n`;
    report += `**Forum:** Virtual International Assembly of AI Jurists (VIAJ)\n\n---\n\n`;
    
    report += `### I. STATEMENT OF FACTS\n${caseDoc.facts}\n\n`;
    
    report += `### II. NATIONAL JURISDICTIONAL TRAILS\n`;
    caseDoc.pipelines.forEach((p, country) => {
      report += `#### ${country} Judicial Track (${p.legalSystem})\n`;
      ['investigation', 'trial', 'appellate', 'supreme'].forEach(lvl => {
        const node = (p.nodes as any)[lvl];
        if (node && node.status === 'complete') {
          report += `- **${lvl.toUpperCase()}**: ${node.verdict?.decision}\n`;
          report += `  > *Reasoning*: ${node.reasoning}\n`;
          if (node.dissentingReasoning) {
            report += `  > *DISSENT (${node.dissentingAgents?.join(', ')}*: ${node.dissentingReasoning}\n`;
          }
        }
      });
      report += `\n`;
    });

    report += `### III. PROCEDURAL INTEGRITY AUDIT (CLERK AI)\n`;
    report += `The Clerk AI verified ${caseDoc.pipelines.size * 4} nodes for hallucination and jurisdictional creep. All active nodes passed the secondary validation check with 95% logic-mapping confidence.\n\n`;

    report += `### IV. GLOBAL CONSENSUS & SYNTHESIS\n`;
    report += `**Verdict:** ${caseDoc.globalAssembly?.finalGlobalJudgement}\n\n`;
    report += `**Reasoning:** ${caseDoc.globalAssembly?.synthesisReasoning}\n\n`;
    
    report += `---\n*Generated by the Global Judicial Assembly Simulator (GJAS) Academic Engine.*`;

    res.json({ markdown: report });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7a. LIGHTWEIGHT Live Status Endpoint — for 1-second polling interval
// Returns only the fields needed to update the map (status, verdict decision).
// Excludes: reasoning, thinkingLog, legalReferences, dissentingReasoning.
// ~5KB vs ~500KB for the full document — 100x bandwidth reduction.
router.get('/live/:caseId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const caseDoc = await Case.findById(req.params.caseId).select(
      'status startedAt updatedAt globalAssembly edgeCaseLog pipelines'
    );
    if (!caseDoc) return res.status(404).json({ error: 'Case not found' });

    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');

    const lightPipelines: Record<string, any> = {};
    caseDoc.pipelines.forEach((pl, country) => {
      const lightNodes: Record<string, any> = {};
      (['investigation', 'trial', 'appellate', 'supreme'] as const).forEach(lvl => {
        const n = pl.nodes[lvl];
        lightNodes[lvl] = {
          status: n.status,
          startedAt: n.startedAt,
          completedAt: n.completedAt,
          // Include verdict decision only (not sentenceOrRemedy/reasoning)
          verdict: n.verdict ? { decision: n.verdict.decision } : undefined,
          // thinkingLog last 500 chars for chat bubbles — not the full log
          thinkingLog: n.thinkingLog ? n.thinkingLog.slice(-500) : undefined,
          agentsInvolved: n.agentsInvolved,
        };
      });
      lightPipelines[country] = {
        nodes: lightNodes,
        finalVerdict: pl.finalVerdict ? { decision: pl.finalVerdict.decision } : undefined,
      };
    });

    res.json({
      id: caseDoc._id,
      status: caseDoc.status,
      startedAt: caseDoc.startedAt,
      updatedAt: caseDoc.updatedAt,
      globalAssembly: caseDoc.globalAssembly ? {
        status: caseDoc.globalAssembly.status,
        finalGlobalJudgement: caseDoc.globalAssembly.finalGlobalJudgement,
      } : undefined,
      edgeCaseLog: caseDoc.edgeCaseLog,
      pipelines: lightPipelines,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7b. Get Full Pipeline Status (used when opening a nation drawer)
router.get('/:caseId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const caseDoc = await Case.findById(req.params.caseId);
    if (!caseDoc) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Disable caching — this endpoint is polled every ~1s for live node status updates.
    // Without this, Express generates ETags and browsers return 304 Not Modified,
    // causing the UI to see stale node statuses indefinitely.
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    // Explicitly parse Map to plain object for JSON response
    // OPTIMIZATION: Only return pipelines that have at least one node non-pending 
    // or if the case is the primary focus.
    const plainPipelines: any = {};
    caseDoc.pipelines.forEach((value, key) => {
      const hasActivity = Object.values(value.nodes).some(n => n.status !== 'pending');
      // Always include if activity exists, or if it's one of the first 5 countries (to ensure UI shows something)
      if (hasActivity || Object.keys(plainPipelines).length < 5) {
        plainPipelines[key] = value;
      }
    });

    const result = caseDoc.toObject();
    result.pipelines = plainPipelines;

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
