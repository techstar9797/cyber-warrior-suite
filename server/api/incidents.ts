import { Router } from 'express';
import { getRedis } from '../lib/redis';

const router = Router();

// GET /api/incidents?id=... or GET /api/incidents with filters
router.get('/', async (req, res) => {
  // Disable caching for fresh data
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  
  try {
    const redis = await getRedis();
    const { id, q, severity, vector, protocol, zone, role, page = '1', pageSize = '50' } = req.query;

    // Single incident by ID
    if (id) {
      const incident = await redis.json.get(`sec:incident:${id}`);
      return res.json(incident || null);
    }

    // Build search query
    const filters: string[] = [];
    if (severity) filters.push(`@severity:{${severity}}`);
    if (vector) filters.push(`@vector:{${vector}}`);
    if (protocol) filters.push(`@protocol:{${protocol}}`);
    if (zone) filters.push(`@zone:{${zone}}`);
    if (role) filters.push(`@role:{${role}}`);

    const query = filters.length > 0 ? filters.join(' ') : '*';
    const pageNum = parseInt(page as string, 10);
    const pageSizeNum = parseInt(pageSize as string, 10);

    try {
      const results = await redis.ft.search('idx:incidents', query, {
        LIMIT: { from: (pageNum - 1) * pageSizeNum, size: pageSizeNum },
      });

      const incidents = results.documents.map((doc) => doc.value);
      res.json({ total: results.total, items: incidents });
    } catch (error) {
      // Fallback to GETALL if index doesn't exist
      const keys = await redis.keys('sec:incident:*');
      const incidents = await Promise.all(
        keys.map(async (key) => await redis.json.get(key))
      );
      
      // Sort by lastSeen descending (newest first)
      incidents.sort((a: any, b: any) => {
        return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
      });
      
      res.json({ total: incidents.length, items: incidents });
    }
  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

export default router;
