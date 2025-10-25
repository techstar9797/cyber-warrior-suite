#!/usr/bin/env tsx
import { getRedis } from '../../server/lib/redis';
import { uid, nowIso, DEFAULT_FUNC } from './util';

const API = 'https://api.abuseipdb.com/api/v2/blacklist';

async function pollAbuseIPDB(intervalMs: number) {
  const r = await getRedis();
  const key = process.env.ABUSEIPDB_API_KEY;
  if (!key) throw new Error('Set ABUSEIPDB_API_KEY');

  console.log('🌐 AbuseIPDB ingestor started');
  console.log(`   Polling every ${intervalMs / 1000}s`);

  while (true) {
    try {
      console.log('📡 Fetching AbuseIPDB blacklist...');
      const res = await fetch(API, {
        headers: { Key: key, Accept: 'application/json' },
      });
      
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const body = (await res.json()) as any;
      const list = Array.isArray(body?.data) ? body.data : [];
      const now = nowIso();

      console.log(`✅ Retrieved ${list.length} malicious IPs`);

      for (const item of list) {
        const ip = item.ipAddress;
        const id = `INC-${uid('abuseip', ip)}`;
        const inc = {
          id,
          functionName: DEFAULT_FUNC,
          asset: { id: ip, name: ip, zone: 'internet', role: 'ip', ip },
          protocol: 'IP',
          vector: 'malicious_ip',
          severity: (item.abuseConfidenceScore >= 90 ? 'critical' : 'high') as 'critical' | 'high',
          details: {
            score: item.abuseConfidenceScore,
            usageType: item.usageType,
            country: item.countryCode,
            lastReportedAt: item.lastReportedAt,
            categories: item.categories,
          },
          firstSeen: now,
          lastSeen: now,
          count: 1,
          detector: 'agent-detector-threatfeed',
          runId: `run-${uid(id)}`,
          status: 'open' as const,
        };

        await r.json.set(`sec:incident:${inc.id}`, '$', inc);
        await r.xAdd('sec:events', '*', { data: JSON.stringify(inc) });
        console.log(`→ event ${inc.id} ${ip} sev=${inc.severity}`);
      }
    } catch (e: any) {
      console.error('❌ AbuseIPDB poll error:', e?.message || e);
    }
    
    console.log(`⏳ Next poll in ${intervalMs / 1000}s...`);
    await new Promise((res) => setTimeout(res, intervalMs));
  }
}

const intervalMs = Number(process.env.ABUSEIPDB_INTERVAL_MS || 300000); // 5m default
pollAbuseIPDB(intervalMs).catch((e) => {
  console.error(e);
  process.exit(1);
});

