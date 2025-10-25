import { Router } from 'express';
import { getRedis } from '../lib/redis';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const redis = await getRedis();
    const keys = await redis.keys('sec:asset:*');
    const assets = await Promise.all(
      keys.map(async (key) => await redis.json.get(key))
    );
    res.json(assets);
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

export default router;
