# Live Feeds Integration Setup

## Overview

The Cyber Warrior Suite now supports real-time data ingestion from multiple sources:
- **IoT-23 Dataset** (Stratosphere IPS Labs)
- **Suricata EVE JSON** (NIDS alerts)
- **AbuseIPDB** (Live threat intelligence)
- **AlienVault OTX** (Live threat pulses)
- **Demo Mode** (Synthetic anomalies)

## Architecture

```
Data Sources → Ingestor → Redis Streams (sec:events) → Rules Worker → Redis Streams (sec:alerts) → Actions Worker → Slack
```

## Quick Start

### 1. Start Redis Stack
```bash
npm run redis:up
npm run seed:redis
```

### 2. Start Backend API
```bash
npm run dev:backend
```

### 3. Start Workers (in separate terminals)
```bash
# Terminal 3: Rules worker
npm run worker:rules

# Terminal 4: Actions worker  
npm run worker:actions
```

### 4. Start Ingestor (choose one)

**Demo Mode (Synthetic Data)**
```bash
npm run ingest:demo
```

**IoT-23 Dataset** (Requires dataset file)
```bash
# Download IoT-23 dataset from: https://www.stratosphereips.org/datasets-iot23
# Place CSV file in tools/datasets/iot23.csv
npm run ingest:iot23
```

**Live Threat Feeds**
```bash
# Set API keys in environment
export ABUSEIPDB_API_KEY=your_key
export OTX_API_KEY=your_key

npm run ingest:abuseipdb
npm run ingest:otx
```

### 5. Start Frontend
```bash
npm run dev
```

## IoT-23 Dataset Integration

The [IoT-23 dataset](https://www.stratosphereips.org/datasets-iot23) from Stratosphere IPS Labs is now supported as an ingestion source.

### Dataset Features
- **20 IoT devices** with labeled network traffic
- **Malware families**: Mirai, Torii, Hakai
- **Attack vectors**: Malware propagation, DDoS, port scanning
- **Time series data** with labeled anomalies

### Mapping to Incident Schema

The ingestor automatically maps IoT-23 labels to incident vectors:

| IoT-23 Label | Mapped Vector | Severity |
|-------------|---------------|----------|
| Mirai-based attacks | `malware_propagation` | Critical |
| DDoS | `ddos` | Critical |
| Port Scanning | `p2p_scan` | High |
| Generic Attacks | `lateral_movement_it_ot` | High |
| Unknown | `network_anomaly` | Medium |

### Usage
```bash
# Download IoT-23 dataset (from Stratosphere IPS Labs)
# Place CSV file in tools/datasets/iot23.csv

# Start ingestion (replays at 1x speed with looping)
npm run ingest:iot23

# Customize replay speed
tsx tools/ingest/live-feeds.ts --source=iot23 --path=tools/datasets/iot23.csv --speed=2 --loop --function=iot_edge
```

## Suricata Integration

According to the [Suricata documentation](https://docs.suricata.io/en/latest/quickstart.html), Suricata outputs EVE JSON logs that can be directly ingested.

### Using Suricata EVE JSON
```bash
# Option 1: Read existing eve.json file
tsx tools/ingest/live-feeds.ts --source=suricata_replay --path=/var/log/suricata/eve.json --speed=3 --loop

# Option 2: Tail live Suricata output
tail -f /var/log/suricata/eve.json | tsx tools/ingest/live-feeds.ts --source=suricata_replay --path=-
```

### Suricata Alert Mapping
- `event_type == "alert"` → Incident created
- Severity >= 3 → High severity
- Severity < 3 → Medium severity
- Signature metadata → Incident details

## Data Flow

1. **Ingestor** reads from data source (CSV/JSON/Live API)
2. Normalizes to `IncidentInput` schema
3. Publishes to `sec:events` stream in Redis
4. **Rules Worker** consumes events, evaluates rules
5. Publishes alerts to `sec:alerts` stream
6. **Actions Worker** consumes alerts, sends Slack notifications
7. Updates Agent Run documents in Redis

## Agent Run Tracking

Each incident creates an Agent Run document in Redis (`sec:run:{runId}`) with:
- Detector agent (source of detection)
- Planner agent (rule evaluation)
- Executor agent (action execution)
- Timeline of tool calls
- Slack notification thread tracking

## Troubleshooting

### No incidents appearing in UI
```bash
# Check Redis data
redis-cli KEYS "sec:incident:*"

# Check events stream
redis-cli XINFO STREAM sec:events
```

### Alerts not firing
```bash
# Check rules
redis-cli JSON.GET sec:rules

# Check alerts stream
redis-cli XINFO STREAM sec:alerts
```

### Slack not posting
- Verify `COMPOSIO_API_KEY` is set
- Check backend logs for API errors
- Verify simulated mode logs in console

## References

- [IoT-23 Dataset](https://www.stratosphereips.org/datasets-iot23) - Stratosphere IPS Labs
- [Suricata Quickstart](https://docs.suricata.io/en/latest/quickstart.html) - Suricata Documentation
- [AbuseIPDB API](https://www.abuseipdb.com/api) - Threat Intelligence
- [AlienVault OTX](https://otx.alienvault.com/api) - Threat Pulses
