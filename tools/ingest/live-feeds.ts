#!/usr/bin/env tsx
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { setTimeout as wait } from 'node:timers/promises';
import { getRedis } from '../../server/lib/redis';
import crypto from 'node:crypto';

type Opts = {
  source: string;
  path?: string;
  speed: number;
  intervalMs: number;
  loop: boolean;
  func?: string;
  asset?: string;
};

function uid(...parts: string[]): string {
  return crypto.createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 16);
}

function nowIso(): string {
  return new Date().toISOString();
}

interface IncidentInput {
  id: string;
  functionName: string;
  asset: { id: string; name: string; zone: string; role: string; ip?: string };
  protocol?: string;
  vector: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, unknown>;
  firstSeen: string;
  lastSeen: string;
  count: number;
  detector: string;
  runId: string;
  status?: 'open' | 'ack' | 'closed';
}

async function publishIncident(r: any, inc: IncidentInput) {
  // Upsert JSON doc and push stream event
  await r.json.set(`sec:incident:${inc.id}`, '$', inc);
  await r.xAdd('sec:events', '*', { data: JSON.stringify(inc) });
  console.log('→ event', inc.id, inc.vector, inc.severity);
}

async function runDemo(r: any, opts: Opts) {
  const fn = opts.func || 'mixing';
  const assetName = opts.asset || 'PLC P-401';
  console.log(`🎲 Demo ingestor started for function: ${fn}`);
  
  const incidentTypes = [
    { vector: 'unauthorized_write', severity: 'critical' as const, protocol: 'ModbusTCP' },
    { vector: 'dos', severity: 'critical' as const, protocol: 'TCP' },
    { vector: 'scanning', severity: 'high' as const, protocol: 'TCP' },
    { vector: 'mqtt_anomaly', severity: 'medium' as const, protocol: 'MQTT' },
    { vector: 'protocol_anomaly', severity: 'low' as const, protocol: 'HTTP' },
  ];
  
  while (true) {
    // Generate incident every 5 seconds
    await wait(5000 / opts.speed);
    
    const incidentType = incidentTypes[Math.floor(Math.random() * incidentTypes.length)];
    const id = `INC-${uid('demo', fn, Date.now().toString())}`;
    const now = nowIso();
    
    const inc: IncidentInput = {
      id,
      functionName: fn,
      asset: { id: 'PLC-P401', name: assetName, zone: fn, role: 'PLC' },
      protocol: incidentType.protocol,
      vector: incidentType.vector,
      severity: incidentType.severity,
      details: {
        functionCode: Math.floor(Math.random() * 10) + 1,
        register: 40000 + Math.floor(Math.random() * 100),
        value: Math.floor(Math.random() * 1000),
        unit: 'RPM',
      },
      firstSeen: now,
      lastSeen: now,
      count: 1,
      detector: 'agent-detector-ot',
      runId: `run-${uid(id)}`,
      status: 'open',
    };
    
    await publishIncident(r, inc);
  }
}

async function runCsvReplay(
  r: any,
  opts: Opts,
  mapRow: (row: Record<string, string>) => IncidentInput | null
) {
  if (!opts.path) throw new Error('--path is required for CSV replay');
  const file = path.resolve(process.cwd(), opts.path);
  console.log(`📄 Replaying CSV: ${file}`);
  
  const rl = readline.createInterface({
    input: fs.createReadStream(file),
    crlfDelay: Infinity,
  });
  
  let header: string[] = [];
  let lineNum = 0;
  
  for await (const line of rl) {
    lineNum++;
    if (!line.trim()) continue;
    
    if (!header.length) {
      header = line.split(',').map((s) => s.trim());
      continue;
    }
    
    const cols = line.split(',').map((s) => s.trim());
    const row: Record<string, string> = {};
    header.forEach((h, i) => (row[h] = cols[i]));
    
    const inc = mapRow(row);
    if (inc) {
      await publishIncident(r, inc);
      await wait(1000 / (opts.speed || 1));
    }
  }
  
  console.log(`✅ Replay complete (${lineNum} lines)`);
  if (opts.loop) {
    console.log('🔄 Looping...');
    return runCsvReplay(r, opts, mapRow);
  }
}

async function runJsonlReplay(
  r: any,
  opts: Opts,
  mapItem: (obj: any) => IncidentInput | null
) {
  if (!opts.path) throw new Error('--path is required for JSON/JSONL replay');
  const file = path.resolve(process.cwd(), opts.path);
  console.log(`📄 Replaying JSONL: ${file}`);
  
  const rl = readline.createInterface({
    input: fs.createReadStream(file),
    crlfDelay: Infinity,
  });
  
  let lineNum = 0;
  
  for await (const line of rl) {
    if (!line.trim()) continue;
    lineNum++;
    
    try {
      const obj = JSON.parse(line);
      const inc = mapItem(obj);
      if (inc) {
        await publishIncident(r, inc);
        await wait(1000 / (opts.speed || 1));
      }
    } catch (e) {
      console.warn(`⚠️  Skip line ${lineNum}:`, e);
    }
  }
  
  console.log(`✅ Replay complete (${lineNum} lines)`);
  if (opts.loop) {
    console.log('🔄 Looping...');
    return runJsonlReplay(r, opts, mapItem);
  }
}

async function runAbuseIPDB(r: any, opts: Opts) {
  const key = process.env.ABUSEIPDB_API_KEY;
  const url = 'https://api.abuseipdb.com/api/v2/blacklist';
  
  if (!key) {
    console.warn('⚠️  ABUSEIPDB_API_KEY not set, skipping');
    return;
  }
  
  console.log('🌐 AbuseIPDB ingestor started');
  
  while (true) {
    try {
      const res = await fetch(url, {
        headers: { Key: key, Accept: 'application/json' },
      });
      const data = await res.json();
      const now = nowIso();
      
      for (const item of data?.data || []) {
        const ip = item.ipAddress;
        const id = `INC-${uid('abuseip', ip)}`;
        const inc: IncidentInput = {
          id,
          functionName: opts.func || 'soc',
          asset: { id: ip, name: ip, zone: 'internet', role: 'ip', ip },
          vector: 'malicious_ip',
          severity: item.abuseConfidenceScore >= 90 ? 'critical' : 'high',
          details: {
            categories: item.categories,
            score: item.abuseConfidenceScore,
          },
          firstSeen: now,
          lastSeen: now,
          count: 1,
          detector: 'agent-detector-threatfeed',
          runId: `run-${uid(id)}`,
          status: 'open',
        };
        await publishIncident(r, inc);
      }
      
      await wait(opts.intervalMs || 300000); // 5 min
    } catch (e) {
      console.error('❌ AbuseIPDB error:', e);
      await wait(60000); // Retry in 1 min
    }
  }
}

async function runOTX(r: any, opts: Opts) {
  const key = process.env.OTX_API_KEY;
  
  if (!key) {
    console.warn('⚠️  OTX_API_KEY not set, skipping');
    return;
  }
  
  console.log('🌐 OTX ingestor started');
  let page = 1;
  
  while (true) {
    try {
      const res = await fetch(
        `https://otx.alienvault.com/api/v1/pulses/subscribed?page=${page}`,
        { headers: { 'X-OTX-API-KEY': key } }
      );
      const data = await res.json();
      const now = nowIso();
      
      for (const pulse of data?.results || []) {
        for (const ind of pulse?.indicators || []) {
          const indicator = ind.indicator;
          const id = `INC-${uid('otx', indicator)}`;
          const inc: IncidentInput = {
            id,
            functionName: opts.func || 'soc',
            asset: {
              id: indicator,
              name: indicator,
              zone: 'internet',
              role: ind.type || 'indicator',
              ip: ind.type === 'IPv4' ? indicator : undefined,
            },
            vector: 'threat_indicator',
            severity: 'medium',
            details: { type: ind.type, description: pulse.name },
            firstSeen: now,
            lastSeen: now,
            count: 1,
            detector: 'agent-detector-threatintel',
            runId: `run-${uid(id)}`,
            status: 'open',
          };
          await publishIncident(r, inc);
        }
      }
      
      page = data?.next ? page + 1 : 1;
      await wait(opts.intervalMs || 600000); // 10 min
    } catch (e) {
      console.error('❌ OTX error:', e);
      await wait(60000); // Retry in 1 min
    }
  }
}

async function main() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const m = a.match(/^--([^=]+)=(.*)$/);
      return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
    })
  );
  
  const opts: Opts = {
    source: String(args.source || 'demo'),
    path: args.path ? String(args.path) : undefined,
    speed: args.speed ? Number(args.speed) : 1,
    intervalMs: args.intervalMs ? Number(args.intervalMs) : 0,
    loop: !!args.loop,
    func: args.function ? String(args.function) : undefined,
    asset: args.asset ? String(args.asset) : undefined,
  };

  console.log('🚀 Live Feeds Ingestor');
  console.log('   Source:', opts.source);
  console.log('   Speed:', opts.speed + 'x');
  console.log('   Loop:', opts.loop);
  
  const r = await getRedis();

  switch (opts.source) {
    case 'demo':
      return runDemo(r, opts);

    case 'swat':
      return runCsvReplay(r, opts, (row) => {
        const zone = opts.func || 'swat';
        const ts = row.Timestamp || row.datetime || nowIso();
        
        // Example anomaly detection
        if (Number(row['MV-101']) === 1 && Number(row['FIT-101']) < 0.1) {
          const id = `INC-${uid('swat', ts, 'MV-101')}`;
          return {
            id,
            functionName: zone,
            asset: { id: 'PLC-SWAT-1', name: 'PLC SWAT', zone, role: 'PLC' },
            protocol: 'ModbusTCP',
            vector: 'setpoint_tamper',
            severity: 'high',
            details: { sensor: 'FIT-101', value: row['FIT-101'] },
            firstSeen: ts,
            lastSeen: ts,
            count: 1,
            detector: 'agent-detector-ot',
            runId: `run-${uid(id)}`,
            status: 'open' as const,
          };
        }
        return null;
      });

    case 'ton_iot':
      return runCsvReplay(r, opts, (row) => {
        const ts = row.ts || row.timestamp || nowIso();
        const id = `INC-${uid('ton', row.src_ip || '', row.dst_ip || '', ts)}`;
        return {
          id,
          functionName: opts.func || 'edge',
          asset: {
            id: row.dst_ip || 'edge',
            name: row.dst_ip || 'Edge',
            zone: 'edge',
            role: 'Gateway',
            ip: row.dst_ip,
          },
          protocol: row.proto || 'IP',
          vector: (row.label || '').toLowerCase().includes('dos') ? 'dos' : 'network_anomaly',
          severity: (row.label || '').toLowerCase().includes('dos') ? 'critical' : 'high',
          details: row,
          firstSeen: ts,
          lastSeen: ts,
          count: 1,
          detector: 'agent-detector-netflow',
          runId: `run-${uid(id)}`,
          status: 'open' as const,
        };
      });

    case 'cicids':
      return runCsvReplay(r, opts, (row) => {
        const ts = row.Timestamp || row.Flow_ID || nowIso();
        const id = `INC-${uid('cic', row.Dst_IP || '', ts)}`;
        return {
          id,
          functionName: opts.func || 'soc',
          asset: {
            id: row.Dst_IP || 'host',
            name: row.Dst_IP || 'Host',
            zone: 'it',
            role: 'host',
            ip: row.Dst_IP,
          },
          protocol: row.Protocol || 'IP',
          vector: (row.Label || '').toLowerCase().includes('ddos') ? 'ddos' : 'flow_anomaly',
          severity: (row.Label || '').toLowerCase().includes('ddos') ? 'critical' : 'medium',
          details: row,
          firstSeen: ts,
          lastSeen: ts,
          count: 1,
          detector: 'agent-detector-ids',
          runId: `run-${uid(id)}`,
          status: 'open' as const,
        };
      });

    case 'suricata_replay':
      return runJsonlReplay(r, opts, (obj) => {
        if (obj.event_type !== 'alert') return null;
        const ts = obj.timestamp || nowIso();
        const sig = obj.alert?.signature || 'Suricata Alert';
        const id = `INC-${uid('suri', sig, obj.src_ip || '', obj.dest_ip || '', ts)}`;
        return {
          id,
          functionName: opts.func || 'soc',
          asset: {
            id: obj.dest_ip || 'net',
            name: obj.dest_ip || 'Network',
            zone: 'it',
            role: 'ip',
            ip: obj.dest_ip,
          },
          protocol: obj.proto,
          vector: 'nids_alert',
          severity: obj.alert?.severity >= 3 ? 'high' : 'medium',
          details: {
            signature: sig,
            category: obj.alert?.category,
            flow_id: obj.flow_id,
          },
          firstSeen: ts,
          lastSeen: ts,
          count: 1,
          detector: 'agent-detector-suricata',
          runId: `run-${uid(id)}`,
          status: 'open' as const,
        };
      });

    case 'abuseipdb':
      return runAbuseIPDB(r, opts);

    case 'otx':
      return runOTX(r, opts);

    case 'iot23':
      // IoT-23 dataset from Stratosphere IPS Labs
      return runCsvReplay(r, opts, (row) => {
        const ts = row.ts || row.timestamp || nowIso();
        const label = row.label || '';
        const id = `INC-${uid('iot23', row.id || '', row.dst_ip || '', ts)}`;
        
        // Determine vector based on label
        let vector = 'network_anomaly';
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
        
        if (label.includes('Mirai')) {
          vector = 'malware_propagation';
          severity = 'critical';
        } else if (label.includes('DDoS')) {
          vector = 'ddos';
          severity = 'critical';
        } else if (label.includes('Scan')) {
          vector = 'p2p_scan';
          severity = 'high';
        } else if (label.includes('Attack')) {
          vector = 'lateral_movement_it_ot';
          severity = 'high';
        }
        
        return {
          id,
          functionName: opts.func || 'iot_edge',
          asset: {
            id: row.dst_ip || 'iot-device',
            name: row.dst_ip || 'IoT Device',
            zone: 'iot_network',
            role: 'IoT',
            ip: row.dst_ip,
          },
          protocol: row.proto || 'TCP',
          vector,
          severity,
          details: {
            label,
            src_ip: row.src_ip,
            dst_ip: row.dst_ip,
            port: row.dst_port,
            duration: row.duration,
            orig_bytes: row.orig_bytes,
            resp_bytes: row.resp_bytes,
          },
          firstSeen: ts,
          lastSeen: ts,
          count: 1,
          detector: 'agent-detector-iot23',
          runId: `run-${uid(id)}`,
          status: 'open' as const,
        };
      });

    default:
      throw new Error(`Unknown --source=${opts.source}`);
  }
}

main().catch((e) => {
  console.error('❌ Ingestor failed:', e);
  process.exit(1);
});
