import express, { Request, Response } from 'express';
import CaseLaw from '@/models/CaseLaw.js';
import { expertMiddleware } from '@/middleware/auth.js';

const router = express.Router();

// Get all case law (public)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { jurisdiction, legalSystem, limit = '20', skip = '0', search } = req.query;

    let query: any = {};

    if (jurisdiction) {
      query.jurisdiction = jurisdiction;
    }

    if (legalSystem) {
      query.legalSystem = legalSystem;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
        { keywords: { $regex: search, $options: 'i' } },
        { topics: { $regex: search, $options: 'i' } }
      ];
    }

    const caseLaw = await CaseLaw.find(query)
      .sort({ decisionDate: -1 })
      .skip(parseInt(skip as string))
      .limit(parseInt(limit as string));

    const total = await CaseLaw.countDocuments(query);

    res.json({
      success: true,
      data: caseLaw,
      total,
      limit: parseInt(limit as string),
      skip: parseInt(skip as string)
    });
  } catch (error) {
    console.error('Error fetching case law:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get single case law (public)
router.get('/:caseId', async (req: Request, res: Response) => {
  try {
    const caseLaw = await CaseLaw.findOne({ caseId: req.params.caseId });

    if (!caseLaw) {
      return res.status(404).json({ success: false, error: 'Case law not found' });
    }

    res.json({ success: true, data: caseLaw });
  } catch (error) {
    console.error('Error fetching case law:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Add case law (expert only)
router.post('/', expertMiddleware, async (req: Request, res: Response) => {
  try {
    const caseLawData = req.body;

    // Validate required fields
    const requiredFields = ['caseId', 'title', 'court', 'jurisdiction', 'decisionDate', 'legalSystem'];
    const missingFields = requiredFields.filter(field => !caseLawData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Check if case law already exists
    const existing = await CaseLaw.findOne({ caseId: caseLawData.caseId });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Case law with this ID already exists'
      });
    }

    // Create new case law
    const caseLaw = new CaseLaw(caseLawData);
    await caseLaw.save();

    res.status(201).json({ success: true, data: caseLaw });
  } catch (error) {
    console.error('Error adding case law:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Update case law (expert only)
router.put('/:caseId', expertMiddleware, async (req: Request, res: Response) => {
  try {
    const updates = req.body;

    const caseLaw = await CaseLaw.findOneAndUpdate(
      { caseId: req.params.caseId },
      updates,
      { new: true, runValidators: true }
    );

    if (!caseLaw) {
      return res.status(404).json({ success: false, error: 'Case law not found' });
    }

    res.json({ success: true, data: caseLaw });
  } catch (error) {
    console.error('Error updating case law:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Delete case law (expert only)
router.delete('/:caseId', expertMiddleware, async (req: Request, res: Response) => {
  try {
    const caseLaw = await CaseLaw.findOneAndDelete({ caseId: req.params.caseId });

    if (!caseLaw) {
      return res.status(404).json({ success: false, error: 'Case law not found' });
    }

    res.json({ success: true, message: 'Case law deleted successfully' });
  } catch (error) {
    console.error('Error deleting case law:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Search case law by keywords
router.get('/search/keywords', async (req: Request, res: Response) => {
  try {
    const { keywords, limit = '10' } = req.query;

    if (!keywords) {
      return res.status(400).json({ success: false, error: 'Keywords parameter is required' });
    }

    const keywordArray = (keywords as string).split(',').map(k => k.trim());

    const caseLaw = await CaseLaw.find({
      keywords: { $in: keywordArray }
    }).limit(parseInt(limit as string));

    res.json({ success: true, data: caseLaw });
  } catch (error) {
    console.error('Error searching case law by keywords:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get case law by topic
router.get('/topic/:topic', async (req: Request, res: Response) => {
  try {
    const { limit = '20', skip = '0' } = req.query;

    const caseLaw = await CaseLaw.find({
      topics: req.params.topic
    }).sort({ decisionDate: -1 })
      .skip(parseInt(skip as string))
      .limit(parseInt(limit as string));

    const total = await CaseLaw.countDocuments({ topics: req.params.topic });

    res.json({
      success: true,
      data: caseLaw,
      total,
      topic: req.params.topic
    });
  } catch (error) {
    console.error('Error fetching case law by topic:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;