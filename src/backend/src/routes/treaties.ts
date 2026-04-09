import express, { Request, Response } from 'express';
import Treaty from '@/models/Treaty.js';
import { expertMiddleware } from '@/middleware/auth.js';

const router = express.Router();

// Get all treaties (public)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, topic, limit = '20', skip = '0', search } = req.query;

    let query: any = {};

    if (status) {
      query.status = status;
    }

    if (topic) {
      query.topics = topic;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
        { shortName: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
        { topics: { $regex: search, $options: 'i' } }
      ];
    }

    const treaties = await Treaty.find(query)
      .sort({ adoptionDate: -1 })
      .skip(parseInt(skip as string))
      .limit(parseInt(limit as string));

    const total = await Treaty.countDocuments(query);

    res.json({
      success: true,
      data: treaties,
      total,
      limit: parseInt(limit as string),
      skip: parseInt(skip as string)
    });
  } catch (error) {
    console.error('Error fetching treaties:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get single treaty (public)
router.get('/:treatyId', async (req: Request, res: Response) => {
  try {
    const treaty = await Treaty.findOne({ treatyId: req.params.treatyId });

    if (!treaty) {
      return res.status(404).json({ success: false, error: 'Treaty not found' });
    }

    res.json({ success: true, data: treaty });
  } catch (error) {
    console.error('Error fetching treaty:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Add treaty (expert only)
router.post('/', expertMiddleware, async (req: Request, res: Response) => {
  try {
    const treatyData = req.body;

    // Validate required fields
    const requiredFields = ['treatyId', 'title'];
    const missingFields = requiredFields.filter(field => !treatyData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Check if treaty already exists
    const existing = await Treaty.findOne({ treatyId: treatyData.treatyId });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Treaty with this ID already exists'
      });
    }

    // Create new treaty
    const treaty = new Treaty(treatyData);
    await treaty.save();

    res.status(201).json({ success: true, data: treaty });
  } catch (error) {
    console.error('Error adding treaty:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Update treaty (expert only)
router.put('/:treatyId', expertMiddleware, async (req: Request, res: Response) => {
  try {
    const updates = req.body;

    const treaty = await Treaty.findOneAndUpdate(
      { treatyId: req.params.treatyId },
      updates,
      { new: true, runValidators: true }
    );

    if (!treaty) {
      return res.status(404).json({ success: false, error: 'Treaty not found' });
    }

    res.json({ success: true, data: treaty });
  } catch (error) {
    console.error('Error updating treaty:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Delete treaty (expert only)
router.delete('/:treatyId', expertMiddleware, async (req: Request, res: Response) => {
  try {
    const treaty = await Treaty.findOneAndDelete({ treatyId: req.params.treatyId });

    if (!treaty) {
      return res.status(404).json({ success: false, error: 'Treaty not found' });
    }

    res.json({ success: true, message: 'Treaty deleted successfully' });
  } catch (error) {
    console.error('Error deleting treaty:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get treaties by country participation
router.get('/country/:country', async (req: Request, res: Response) => {
  try {
    const { limit = '20', skip = '0' } = req.query;

    const treaties = await Treaty.find({
      'parties.country': req.params.country
    }).sort({ adoptionDate: -1 })
      .skip(parseInt(skip as string))
      .limit(parseInt(limit as string));

    const total = await Treaty.countDocuments({
      'parties.country': req.params.country
    });

    res.json({
      success: true,
      data: treaties,
      total,
      country: req.params.country
    });
  } catch (error) {
    console.error('Error fetching treaties by country:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Search treaties by topic
router.get('/topic/:topic', async (req: Request, res: Response) => {
  try {
    const { limit = '20', skip = '0' } = req.query;

    const treaties = await Treaty.find({
      topics: req.params.topic
    }).sort({ adoptionDate: -1 })
      .skip(parseInt(skip as string))
      .limit(parseInt(limit as string));

    const total = await Treaty.countDocuments({ topics: req.params.topic });

    res.json({
      success: true,
      data: treaties,
      total,
      topic: req.params.topic
    });
  } catch (error) {
    console.error('Error fetching treaties by topic:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get treaties in force
router.get('/in-force', async (req: Request, res: Response) => {
  try {
    const { limit = '20', skip = '0' } = req.query;

    const treaties = await Treaty.find({
      status: 'in_force'
    }).sort({ entryIntoForceDate: -1 })
      .skip(parseInt(skip as string))
      .limit(parseInt(limit as string));

    const total = await Treaty.countDocuments({ status: 'in_force' });

    res.json({
      success: true,
      data: treaties,
      total,
      limit: parseInt(limit as string),
      skip: parseInt(skip as string)
    });
  } catch (error) {
    console.error('Error fetching in-force treaties:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;