import { Router } from 'express';
import { getRedis } from '../lib/redis';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const redis = await getRedis();
    const rules = await redis.json.get('sec:rules');
    res.json(rules || []);
  } catch (error) {
    console.error('Error fetching rules:', error);
    res.status(500).json({ error: 'Failed to fetch rules' });
  }
});

router.put('/', async (req, res) => {
  try {
    const redis = await getRedis();
    const rules = req.body;
    await redis.json.set('sec:rules', '$', rules);
    res.json({ ok: true });
  } catch (error) {
    console.error('Error saving rules:', error);
    res.status(500).json({ error: 'Failed to save rules' });
  }
});

export default router;
