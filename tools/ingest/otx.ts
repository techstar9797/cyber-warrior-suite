#!/usr/bin/env tsx
import { getRedis } from '../../server/lib/redis';
import { uid, nowIso, DEFAULT_FUNC } from './util';

async function pollOTX(intervalMs: number) {
  const r = await getRedis();
  const key = process.env.OTX_API_KEY;
  if (!key) throw new Error('Set OTX_API_KEY');

  console.log('🌐 AlienVault OTX ingestor started');
  console.log(`   Polling every ${intervalMs / 1000}s`);

  let page = 1;

  while (true) {
    try {
      console.log(`📡 Fetching OTX pulses (page ${page})...`);
      const res = await fetch(
        `https://otx.alienvault.com/api/v1/pulses/subscribed?page=${page}`,
        { headers: { 'X-OTX-API-KEY': key } }
      );
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = (await res.json()) as any;
      const pulses = Array.isArray(data?.results) ? data.results : [];
      const now = nowIso();

      console.log(`✅ Retrieved ${pulses.length} pulses`);

      for (const pulse of pulses) {
        for (const ind of pulse?.indicators || []) {
          const indicator = ind.indicator as string;
          const type = ind.type as string;
          const id = `INC-${uid('otx', type, indicator)}`;
          const inc = {
            id,
            functionName: DEFAULT_FUNC,
            asset: {
              id: indicator,
              name: indicator,
              zone: 'internet',
              role: type || 'indicator',
              ip: type === 'IPv4' || type === 'IPv6' ? indicator : undefined,
            },
            protocol: type === 'IPv4' || type === 'IPv6' ? 'IP' : undefined,
            vector: 'threat_indicator',
            severity: (type === 'IPv4' || type === 'IPv6' ? 'high' : 'medium') as
              | 'high'
              | 'medium',
            details: {
              type,
              title: pulse.name,
              description: pulse.description,
              references: pulse.references,
            },
            firstSeen: now,
            lastSeen: now,
            count: 1,
            detector: 'agent-detector-threatintel',
            runId: `run-${uid(id)}`,
            status: 'open' as const,
          };

          await r.json.set(`sec:incident:${inc.id}`, '$', inc);
          await r.xAdd('sec:events', '*', { data: JSON.stringify(inc) });
          console.log(`→ event ${inc.id} ${type}:${indicator} sev=${inc.severity}`);
        }
      }
      
      page = data?.next ? page + 1 : 1;
      if (!data?.next) {
        console.log('✅ Reached end of pulses, resetting to page 1');
      }
    } catch (e: any) {
      console.error('❌ OTX poll error:', e?.message || e);
    }
    
    console.log(`⏳ Next poll in ${intervalMs / 1000}s...`);
    await new Promise((res) => setTimeout(res, intervalMs));
  }
}

const intervalMs = Number(process.env.OTX_INTERVAL_MS || 600000); // 10m default
pollOTX(intervalMs).catch((e) => {
  console.error(e);
  process.exit(1);
});

