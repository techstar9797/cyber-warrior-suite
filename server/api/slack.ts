import { Router } from 'express';
import { getRedis } from '../lib/redis';

const router = Router();

router.post('/notify', async (req, res) => {
  try {
    const { incidentId, message, eventType = 'STATUS_CHANGE' } = req.body;
    const redis = await getRedis();

    // Get incident
    const incident = await redis.json.get(`sec:incident:${incidentId}`);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Get or create Slack metadata
    const metaKey = `sec:incident:${incidentId}:slack`;
    let meta = await redis.json.get(metaKey) as any;

    if (!meta?.ts) {
      // Simulate first Slack post
      const ts = Date.now().toString();
      meta = { channelId: '#ot-soc', ts };
      await redis.json.set(metaKey, '$', meta);
      
      console.log(`📢 Slack [NEW]: Incident ${incidentId} posted to ${meta.channelId}`);
      console.log(`   Thread TS: ${ts}`);
    } else {
      // Simulate thread reply
      console.log(`📢 Slack [UPDATE]: Incident ${incidentId} - ${eventType}`);
      console.log(`   Message: ${message || 'No message'}`);
      console.log(`   Thread TS: ${meta.ts}`);
    }

    // Update Agent Run
    const runId = `run-${incidentId}`;
    const runKey = `sec:run:${runId}`;
    const exists = await redis.json.get(runKey);
    
    if (!exists) {
      await redis.json.set(runKey, '$', {
        id: runId,
        incidentId,
        startedAt: new Date().toISOString(),
        agents: ['Detector', 'Planner', 'Executor'],
        steps: [],
        outcome: 'mitigated'
      });
    }

    // Add step
    await redis.json.arrAppend(runKey, '$.steps', [{
      id: `step-${Date.now()}`,
      agentId: 'Executor',
      type: 'notify',
      summary: 'Slack notification sent',
      ts: new Date().toISOString(),
      toolCalls: [{
        id: `tc-${Date.now()}`,
        tool: 'slack',
        action: 'postMessage',
        argsPreview: `channel=${meta.channelId}`,
        status: 'success',
        ts: new Date().toISOString()
      }]
    }]);

    res.json({ ok: true, ts: meta.ts, simulated: !process.env.COMPOSIO_API_KEY });
  } catch (error) {
    console.error('Error sending Slack notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

export default router;
