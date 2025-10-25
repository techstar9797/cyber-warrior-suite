import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = Router();

router.post('/refresh', async (req, res) => {
  try {
    console.log('📡 Manual refresh triggered');
    
    // Run hybrid ingestor
    const { stdout, stderr } = await execAsync('tsx tools/ingest/hybrid.ts', {
      cwd: process.cwd(),
      env: process.env,
    });
    
    console.log(stdout);
    if (stderr) console.error(stderr);
    
    res.json({ ok: true, message: 'Hybrid incidents ingested' });
  } catch (error) {
    console.error('Ingest refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh incidents' });
  }
});

export default router;

