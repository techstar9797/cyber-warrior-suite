# Cyber Warrior Suite - Usage Guide

## Overview

The Cyber Warrior Suite is a real-time IIoT security monitoring platform with AI-powered agent orchestration, live threat intelligence feeds, and Slack integration.

## Architecture

### Agent Pipeline (3 Core Agents + 7 Detector Variants)

**Core Agents:**
1. **Detector** - Identifies threats and creates incidents
2. **Planner** - Evaluates rules and determines appropriate actions  
3. **Executor** - Executes actions (Slack notifications, remediation)

**Detector Agent Variants:**
- `agent-detector-ot` 🔍 - OT/ICS protocol anomalies
- `agent-detector-threatfeed` 🔗 - Malicious IPs (AbuseIPDB)
- `agent-detector-threatintel` 🔗 - Threat indicators (AlienVault OTX)
- `agent-detector-netflow` 🌐 - Network flow anomalies
- `agent-detector-ids` 🛡️ - Intrusion detection
- `agent-detector-suricata` 🛡️ - NIDS alerts
- `agent-detector-iot23` 📡 - IoT malware

## Running the System

### Quick Start (All Services)

```bash
# Terminal 1: Backend API
npm run dev:backend

# Terminal 2: Rules Worker (Planner)
npm run worker:rules

# Terminal 3: Actions Worker (Executor)  
npm run worker:actions

# Terminal 4: Frontend
npm run dev
```

### Services

**Backend API** (Port 3001)
- Health: http://localhost:3001/health
- Incidents: `GET /api/incidents`
- Agent Runs: `GET /api/agent-runs?limit=20`
- Refresh Feed: `POST /api/ingest/refresh`

**Frontend** (Port 8080)
- Dashboard: http://localhost:8080
- Incidents: http://localhost:8080/incidents
- Agent Runs: http://localhost:8080/agent-runs
- Assets: http://localhost:8080/assets
- Topology: http://localhost:8080/topology
- Settings: http://localhost:8080/settings

## Using the Dashboard

### 1. Incidents Page

**Manual Refresh:**
- Click **"Refresh Feed"** button to fetch new hybrid incidents (7 synthetic + 3 live threats)
- Click **"Reload"** button to refresh the current view
- Incidents sorted newest first

**Filters:**
- Search by text
- Filter by severity (Critical, High, Medium, Low)
- Filter by attack vector
- Filter by protocol

**Actions:**
- Click any incident to view details
- Click "Notify in Slack" to send alert

### 2. Agent Runs Page

**View Agent Activity:**
- Shows recent 20 agent runs
- Click **"Refresh"** to load latest runs
- See which agents acted: Detector → Planner → Executor
- View timeline with tool calls

**Agent Attribution:**
- Each step shows which agent performed it
- Tool calls show status (success/error)
- Timestamps for full audit trail

### 3. Assets Page

View all monitored assets:
- PLCs, RTUs, HMIs, Gateways
- IP addresses from threat feeds
- IoT devices

### 4. Settings Page

**Integrations:**
- Slack status (simulated until Composio connected)
- Configure detection rules

**Rules Editor:**
- View active rules
- Edit rules JSON
- Save changes to Redis

## Data Ingestion

### Hybrid Approach (Recommended)

**Manual Refresh:**
```bash
# Via UI: Click "Refresh Feed" button on Incidents page
# Via API: POST http://localhost:3001/api/ingest/refresh
# Via CLI: npm run ingest:hybrid
```

**Mix Ratio:**
- 70% Synthetic OT/ICS incidents (representative attack vectors)
- 30% Live threat intelligence (AbuseIPDB sample)

**Incident Variety:**
- `unauthorized_write` - Critical Modbus tampering
- `setpoint_tamper` - High severity process control
- `lateral_movement_it_ot` - Critical IT-to-OT bridge attacks
- `mqtt_anomaly` - Medium IoT protocol issues
- `p2p_scan` - High network reconnaissance
- `malicious_ip` - Critical/High threat intelligence

### Live Feeds (Scheduled - Not Recommended for Limited API)

**AbuseIPDB (every 5 min):**
```bash
npm run ingest:abuseipdb
```

**AlienVault OTX (every 10 min):**
```bash
npm run ingest:otx
```

**Both Together:**
```bash
npm run ingest:feeds
```

⚠️ **Warning:** Live feeds consume API calls. Use hybrid approach for demo/testing.

## API Keys

**Set in Environment:**
```bash
export COMPOSIO_API_KEY=ak_PkU0YUmr6D5Neg_C3iDQ
export ABUSEIPDB_API_KEY=9e3b8810539dc8340b27d23d82961b0bf9143d8da6c5e03ef97d3ed24920aec7974548a11b665186
export OTX_API_KEY=46a81596861e5200574cffe7603b6eb9606537ae2ec87490128e2468ba99a12d
```

## Slack Integration

**Current Status:** Simulated (Composio API endpoint unreachable)

**What's Working:**
- ✅ Slack notification flow
- ✅ Agent Run tracking
- ✅ Thread management in Redis
- ✅ Console logging

**To Enable Real Slack:**
1. Authenticate with Composio: `composio login`
2. Connect Slack workspace in Composio dashboard
3. Invite app to #ot-soc channel
4. Backend will automatically use real Slack API

## Redis Data Structure

**Incidents:** `sec:incident:{id}`
**Agent Runs:** `sec:run:{runId}`
**Rules:** `sec:rules`
**Assets:** `sec:asset:{id}`
**Streams:**
- `sec:events` - Raw detection events
- `sec:alerts` - Rules-matched alerts
- `sec:actions` - Actions to execute

**Slack Metadata:** `sec:incident:{id}:slack` - Thread tracking

## Monitoring

### Check Services
```bash
ps aux | grep -E "(tsx server|tsx tools)" | grep -v grep
```

### Check Logs
```bash
tail -f /tmp/backend.log
tail -f /tmp/rules-worker.log
tail -f /tmp/actions-worker.log
```

### Check Redis
```bash
redis-cli KEYS "sec:incident:*" | wc -l
redis-cli KEYS "sec:run:*" | wc -l
redis-cli JSON.GET sec:rules
```

## Troubleshooting

### Agent Runs page shows "HUNG" error
- **Cause:** Too many agent runs (11,000+) loading at once
- **Fix:** Limited to 20 runs per request (already fixed)
- **Solution:** Refresh the page

### Incidents page shows too many threat IPs
- **Cause:** Live feeds polling continuously
- **Fix:** Use hybrid ingestor with manual refresh
- **Solution:** Click "Refresh Feed" button instead of running live feeds

### No new incidents appearing
- **Check:** Workers are running (rules + actions)
- **Check:** Backend API is up
- **Try:** Click "Refresh Feed" button

## Best Practices

1. **Use Hybrid Ingestor** - Better variety, preserves API limits
2. **Manual Refresh** - Click "Refresh Feed" when you want new incidents
3. **Limit Agent Runs** - View recent 20 runs for performance
4. **Monitor Workers** - Ensure rules and actions workers are running
5. **Check Redis** - Use RedisInsight (port 8001) for data inspection

## Performance

- **Agent Runs**: Limited to 20 most recent
- **Incidents**: Sorted by newest first
- **Redis**: LRU eviction enabled
- **Frontend**: Manual refresh prevents overwhelming API calls
- **Hybrid Batches**: 10 incidents per refresh (balanced)

## What You're Seeing

**Total Agents in System:** 10 (3 core + 7 detector variants)

**Active Right Now:**
- 1 Backend API server
- 1 Rules Worker (Planner agent)
- 1 Actions Worker (Executor agent)
- Multiple Detector agents (via hybrid ingestor)

**Data Volume:**
- 11,000+ incidents in Redis
- 11,000+ agent runs tracked
- Showing most recent 50 incidents by default
- Showing most recent 20 agent runs

**Success Metrics:**
- ✅ Incidents ingested and displayed
- ✅ Agent attribution working
- ✅ Planner evaluating rules
- ✅ Executor sending notifications
- ✅ Timeline captured in Agent Runs
- ✅ Manual refresh working
