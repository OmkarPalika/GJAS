import express from 'express';
import Registry from '../models/Registry.js';

const router = express.Router();

// Get the full jurisdictional registry
router.get('/', async (_req, res) => {
  try {
    const registries = await Registry.find({});
    // Transform to the Record format used by the frontend for compatibility
    const registryMap: Record<string, any> = {};
    registries.forEach(r => {
      registryMap[r.countryCode] = {
        name: r.name,
        sys: r.sys,
        category: r.category,
        investigation: r.investigation,
        trial: r.trial,
        appellate: r.appellate,
        supreme: r.supreme,
        color: r.color,
        db_query_name: r.db_query_name,
        courts: r.courts
      };
    });
    res.json(registryMap);
  } catch (err) {
    console.error('Error fetching registry:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single registry entry
router.get('/:code', async (req, res) => {
  try {
    const registry = await Registry.findOne({ countryCode: req.params.code.toUpperCase() });
    if (!registry) return res.status(404).json({ error: 'Registry entry not found' });
    res.json(registry);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
