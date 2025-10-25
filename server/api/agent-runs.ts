import { Router } from 'express';
import { getRedis } from '../lib/redis';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const redis = await getRedis();
    const keys = await redis.keys('sec:run:*');
    const runs = await Promise.all(
      keys.map(async (key) => await redis.json.get(key))
    );
    
    // Sort by startedAt, most recent first
    runs.sort((a: any, b: any) => {
      return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
    });
    
    res.json(runs);
  } catch (error) {
    console.error('Error fetching agent runs:', error);
    res.status(500).json({ error: 'Failed to fetch agent runs' });
  }
});

export default router;
