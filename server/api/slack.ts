import { Router } from 'express';
import { getRedis } from '../lib/redis';
import { sendSlackNotification } from '../lib/slack';

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

    // Send Slack notification
    const result = await sendSlackNotification({ incidentId, message, eventType });

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
      summary: result.simulated ? 'Slack notification simulated' : 'Slack notification sent',
      ts: new Date().toISOString(),
      toolCalls: [{
        id: `tc-${Date.now()}`,
        tool: 'slack',
        action: 'postMessage',
        argsPreview: `channel=#ot-soc`,
        status: 'success',
        ts: new Date().toISOString()
      }]
    }]);

    res.json(result);
  } catch (error) {
    console.error('Error sending Slack notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

export default router;
