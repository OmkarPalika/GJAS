import express, { Request, Response } from 'express';
import Constitution from '@/models/Constitution.js';

const router = express.Router();

// Get all constitutions
router.get('/', async (req: Request, res: Response) => {
  try {
    const constitutions = await Constitution.find({});
    res.json(constitutions);
  } catch (error) {
    console.error('Error fetching constitutions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific constitution by country
router.get('/:country', async (req: Request, res: Response) => {
  try {
    const country = req.params.country as string;
    const constitution = await Constitution.findOne({
      country: { $regex: new RegExp(country, 'i') }
    });

    if (!constitution) {
      return res.status(404).json({ error: 'Constitution not found' });
    }

    res.json(constitution);
  } catch (error) {
    console.error('Error fetching constitution:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search constitutions by keyword
router.get('/search/:keyword', async (req: Request, res: Response) => {
  try {
    const keyword = req.params.keyword;
    const constitutions = await Constitution.find({
      $text: { $search: keyword }
    });

    res.json(constitutions);
  } catch (error) {
    console.error('Error searching constitutions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;