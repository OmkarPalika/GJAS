import express from 'express';
import { MongoClient } from 'mongodb';

const router = express.Router();
const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'gjas';

// Get all constitutions
router.get('/', async (req, res) => {
  let client;
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    const constitutions = await db.collection('constitutions').find({}).toArray();
    res.json(constitutions);
  } catch (error) {
    console.error('Error fetching constitutions:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

// Get a specific constitution by country
router.get('/:country', async (req, res) => {
  let client;
  try {
    const country = req.params.country;
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    const constitution = await db.collection('constitutions').findOne({
      country: { $regex: new RegExp(country, 'i') }
    });
    
    if (!constitution) {
      return res.status(404).json({ error: 'Constitution not found' });
    }
    
    res.json(constitution);
  } catch (error) {
    console.error('Error fetching constitution:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

// Search constitutions by keyword
router.get('/search/:keyword', async (req, res) => {
  let client;
  try {
    const keyword = req.params.keyword;
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    const constitutions = await db.collection('constitutions').find({
      $text: { $search: keyword }
    }).toArray();
    
    res.json(constitutions);
  } catch (error) {
    console.error('Error searching constitutions:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) {
      await client.close();
    }
  }
});

export default router;