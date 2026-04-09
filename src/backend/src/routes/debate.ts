import express, { Response } from 'express';
import { debateService } from '@/services/debate.service.js';
import { authMiddleware, AuthRequest } from '@/middleware/auth.js';

const router = express.Router();

// Start a new debate for a case
router.post('/start', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { caseId, topic, perspectiveA, perspectiveB, maxTurns } = req.body;
    
    if (!caseId || !topic || !perspectiveA || !perspectiveB) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const state = await debateService.startDebate(caseId, topic, perspectiveA, perspectiveB, maxTurns);
    res.json({ message: 'Debate initiated', state });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Process the next turn in the debate
router.post('/next-turn', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { caseId } = req.body;
    if (!caseId) return res.status(400).json({ error: 'Case ID is required' });

    const turn = await debateService.processNextTurn(caseId);
    if (!turn) {
      return res.status(400).json({ error: 'Debate has ended or case not found' });
    }

    res.json({ turn, state: debateService.getDebateState(caseId) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get current state of a debate
router.get('/status/:caseId', authMiddleware, (req: AuthRequest, res: Response) => {
  const state = debateService.getDebateState(req.params.caseId as string);
  if (!state) return res.status(404).json({ error: 'Debate session not found' });
  res.json(state);
});

export default router;
