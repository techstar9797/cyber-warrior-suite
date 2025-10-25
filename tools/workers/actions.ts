#!/usr/bin/env tsx
import { getRedis } from '../../server/lib/redis';
import { sendSlackNotification } from '../../server/lib/slack';

const GROUP = 'cg:actions';
const CONSUMER = 'actions-1';

function parseFields(fields: Record<string, string>) {
  const out: any = {};
  for (const [k, v] of Object.entries(fields)) {
    try {
      out[k] = JSON.parse(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

async function ensureGroup(r: any, stream: string) {
  try {
    await r.xGroupCreate(stream, GROUP, '$', { MKSTREAM: true });
  } catch {
    // Group already exists
  }
}

async function main() {
  console.log('⚡ Actions Worker starting...');
  const r = await getRedis();
  await ensureGroup(r, 'sec:alerts');

  while (true) {
    try {
      const resp = await r.xReadGroup(
        GROUP,
        CONSUMER,
        [{ key: 'sec:alerts', id: '>' }],
        { COUNT: 50, BLOCK: 5000 }
      );
      
      if (!resp) continue;

      for (const s of resp) {
        for (const msg of s.messages) {
          const { alert } = parseFields(msg.message);
          const incident = typeof alert === 'string' ? JSON.parse(alert) : alert;

          console.log(`📨 Processing alert for incident ${incident.id}`);

          // Send Slack notification
          const result = await sendSlackNotification({
            incidentId: incident.id,
            message: `Rule matched: ${incident.rule || 'Unknown rule'}`,
            eventType: 'ALERT',
          });

          console.log(
            `✅ Slack notification ${result.simulated ? 'simulated' : 'sent'} for incident ${incident.id}`
          );

          // Update Agent Run
          const runId = incident.runId || `run-${incident.id}`;
          const runKey = `sec:run:${runId}`;
          const exists = await r.json.get(runKey);
          
          if (!exists) {
            await r.json.set(runKey, '$', {
              id: runId,
              incidentId: incident.id,
              startedAt: new Date().toISOString(),
              agents: [
                incident.detector || 'Detector',
                'Planner',
                'Executor',
              ],
              steps: [],
              outcome: 'mitigated',
            });
          }

          // Add step
          await r.json.arrAppend(runKey, '$.steps', [
            {
              id: `step-${Date.now()}`,
              agentId: 'Executor',
              type: 'notify',
              summary: result.simulated
                ? 'Slack notification simulated'
                : 'Slack notification sent',
              ts: new Date().toISOString(),
              toolCalls: [
                {
                  id: `tc-${Date.now()}`,
                  tool: 'slack',
                  action: 'postMessage',
                  argsPreview: `channel=#ot-soc`,
                  status: 'success',
                  ts: new Date().toISOString(),
                },
              ],
            },
          ]);

          await r.xAck('sec:alerts', GROUP, msg.id);
        }
      }
    } catch (error) {
      console.error('❌ Actions worker error:', error);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

main().catch((e) => {
  console.error('❌ Actions worker failed:', e);
  process.exit(1);
});
