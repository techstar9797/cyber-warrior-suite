#!/usr/bin/env tsx
/**
 * Hybrid Ingestor - Mixes live threat intelligence with synthetic OT/ICS incidents
 * Run on-demand via API or manual trigger, not on a schedule
 */
import { getRedis } from '../../server/lib/redis';
import { uid, nowIso, DEFAULT_FUNC } from './util';

// Incident templates for variety
const incidentTemplates = [
  {
    vector: 'unauthorized_write',
    severity: 'critical' as const,
    protocol: 'ModbusTCP',
    zone: 'mixing',
    role: 'PLC',
    assetName: 'PLC P-401',
  },
  {
    vector: 'mqtt_anomaly',
    severity: 'medium' as const,
    protocol: 'MQTT',
    zone: 'packaging',
    role: 'Gateway',
    assetName: 'Gateway PKG-01',
  },
  {
    vector: 'setpoint_tamper',
    severity: 'high' as const,
    protocol: 'ModbusTCP',
    zone: 'bottling',
    role: 'PLC',
    assetName: 'PLC B-220',
  },
  {
    vector: 'p2p_scan',
    severity: 'high' as const,
    protocol: 'TCP',
    zone: 'it_network',
    role: 'Gateway',
    assetName: 'Edge Gateway',
  },
  {
    vector: 'lateral_movement_it_ot',
    severity: 'critical' as const,
    protocol: 'TCP',
    zone: 'dmz',
    role: 'Gateway',
    assetName: 'DMZ Gateway',
  },
];

async function fetchLiveThreatSample(): Promise<any[]> {
  const incidents: any[] = [];
  
  // Fetch small sample from AbuseIPDB (if key available)
  if (process.env.ABUSEIPDB_API_KEY) {
    try {
      const res = await fetch('https://api.abuseipdb.com/api/v2/blacklist?limit=5', {
        headers: {
          Key: process.env.ABUSEIPDB_API_KEY,
          Accept: 'application/json',
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        const now = nowIso();
        
        for (const item of (data?.data || []).slice(0, 3)) {
          const ip = item.ipAddress;
          const id = `INC-${uid('abuseip', ip, Date.now())}`;
          incidents.push({
            id,
            functionName: 'soc',
            asset: { id: ip, name: ip, zone: 'internet', role: 'ip', ip },
            protocol: 'IP',
            vector: 'malicious_ip',
            severity: item.abuseConfidenceScore >= 90 ? 'critical' : 'high',
            details: {
              score: item.abuseConfidenceScore,
              country: item.countryCode,
            },
            firstSeen: now,
            lastSeen: now,
            count: 1,
            detector: 'agent-detector-threatfeed',
            runId: `run-${uid(id)}`,
            status: 'open',
          });
        }
      }
    } catch (e) {
      console.warn('AbuseIPDB fetch failed:', e);
    }
  }
  
  return incidents;
}

async function generateSyntheticIncidents(count: number): Promise<any[]> {
  const incidents: any[] = [];
  const now = nowIso();
  
  for (let i = 0; i < count; i++) {
    const template = incidentTemplates[Math.floor(Math.random() * incidentTemplates.length)];
    const id = `INC-${uid('synthetic', Date.now(), i)}`;
    
    incidents.push({
      id,
      functionName: template.zone,
      asset: {
        id: `${template.role}-${template.zone}`,
        name: template.assetName,
        zone: template.zone,
        role: template.role,
      },
      protocol: template.protocol,
      vector: template.vector,
      severity: template.severity,
      details: {
        register: 40000 + Math.floor(Math.random() * 100),
        value: Math.floor(Math.random() * 1000),
        previousValue: Math.floor(Math.random() * 1000),
      },
      firstSeen: now,
      lastSeen: now,
      count: 1,
      detector: 'agent-detector-ot',
      runId: `run-${uid(id)}`,
      status: 'open',
    });
  }
  
  return incidents;
}

async function ingestHybridBatch() {
  console.log('🔄 Hybrid Ingestor - Fetching mixed incidents...');
  const r = await getRedis();
  
  // Generate a mix: 70% synthetic OT/ICS, 30% live threat intel
  const syntheticCount = 7;
  const liveThreats = await fetchLiveThreatSample();
  const synthetic = await generateSyntheticIncidents(syntheticCount);
  
  const allIncidents = [...synthetic, ...liveThreats];
  
  console.log(`📊 Batch: ${synthetic.length} synthetic + ${liveThreats.length} live threats`);
  
  // Shuffle for variety
  allIncidents.sort(() => Math.random() - 0.5);
  
  for (const inc of allIncidents) {
    await r.json.set(`sec:incident:${inc.id}`, '$', inc);
    await r.xAdd('sec:events', '*', { data: JSON.stringify(inc) });
    console.log(`→ ${inc.id} ${inc.vector} (${inc.severity}) [${inc.detector}]`);
  }
  
  console.log(`✅ Ingested ${allIncidents.length} hybrid incidents`);
}

// Run once when called
ingestHybridBatch()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ Hybrid ingest failed:', e);
    process.exit(1);
  });

