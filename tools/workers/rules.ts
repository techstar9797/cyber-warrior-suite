#!/usr/bin/env tsx
import { getRedis } from '../../server/lib/redis';

const GROUP = 'cg:rules';
const CONSUMER = 'rules-1';

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
  console.log('🔧 Rules Worker starting...');
  const r = await getRedis();
  await ensureGroup(r, 'sec:events');
  
  const rules = (await r.json.get('sec:rules')) || [];
  console.log(`✅ Loaded ${rules.length} rules`);

  while (true) {
    try {
      const resp = await r.xReadGroup(
        GROUP,
        CONSUMER,
        [{ key: 'sec:events', id: '>' }],
        { COUNT: 50, BLOCK: 5000 }
      );
      
      if (!resp) continue;
      
      for (const stream of resp) {
        for (const msg of stream.messages) {
          const data = parseFields(msg.message);
          const incident = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
          
          // Simple rule matching - check if any rule matches the incident
          const matchingRules = rules.filter((rule: any) => {
            // If rule has vector matching
            if (rule.if?.vector && rule.if.vector !== incident.vector) {
              return false;
            }
            // If rule has severity threshold
            if (rule.if?.severity) {
              const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
              const incidentSev = severityOrder[incident.severity as keyof typeof severityOrder] || 0;
              const ruleSev = severityOrder[rule.if.severity as keyof typeof severityOrder] || 0;
              if (incidentSev < ruleSev) {
                return false;
              }
            }
            return true;
          });
          
          if (matchingRules.length > 0) {
            // Update Agent Run with planner step
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
                outcome: 'pending',
              });
            }
            
            // Add planner step (rule evaluation)
            await r.json.arrAppend(runKey, '$.steps', [
              {
                id: `step-${Date.now()}`,
                agentId: 'Planner',
                type: 'evaluate',
                summary: `Matched ${matchingRules.length} rule(s)`,
                ts: new Date().toISOString(),
                toolCalls: [
                  {
                    id: `tc-${Date.now()}`,
                    tool: 'rules_engine',
                    action: 'evaluate',
                    argsPreview: `rules=${matchingRules.map((r: any) => r.name).join(',')}`,
                    status: 'success',
                    ts: new Date().toISOString(),
                  },
                ],
              },
            ]);
            
            for (const rule of matchingRules) {
              await r.xAdd('sec:alerts', '*', {
                alert: JSON.stringify({
                  ...incident,
                  rule: rule.name,
                  actions: rule.actions || [],
                }),
              });
            }
            console.log(`✅ Alert created for incident ${incident.id} (${matchingRules.length} rules matched)`);
          }
          
          await r.xAck('sec:events', GROUP, msg.id);
        }
      }
    } catch (error) {
      console.error('❌ Rules worker error:', error);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

main().catch((e) => {
  console.error('❌ Rules worker failed:', e);
  process.exit(1);
});
