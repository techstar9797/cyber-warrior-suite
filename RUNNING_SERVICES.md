# Running Services Status

## All Services Launched ✅

### Backend Services

**1. Backend API Server**
- **Port**: 3001
- **Status**: Running
- **Log**: `/tmp/backend.log`
- **Health**: http://localhost:3001/health

**2. Rules Worker**
- **Status**: Running
- **Log**: `/tmp/rules-worker.log`
- **Function**: Consumes `sec:events` → Evaluates rules → Produces `sec:alerts`

**3. Actions Worker**
- **Status**: Running
- **Log**: `/tmp/actions-worker.log`
- **Function**: Consumes `sec:alerts` → Sends Slack notifications → Updates Agent Runs

**4. Demo Ingestor**
- **Status**: Running
- **Log**: `/tmp/ingest.log`
- **Function**: Generates incidents every 5 seconds → Pushes to `sec:events`

**5. Frontend (Vite)**
- **Port**: 8080
- **Status**: Running
- **URL**: http://localhost:8080

## Data Flow

```
┌─────────────────┐
│  Demo Ingestor  │ (every 5 seconds)
│   (mixing fn)   │
└────────┬────────┘
         │ incident
         ▼
┌─────────────────┐
│  Redis Stream   │
│   sec:events    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Rules Worker   │ (evaluates 7 rules)
│   (Planner)     │
└────────┬────────┘
         │ alert (if rule matches)
         ▼
┌─────────────────┐
│  Redis Stream   │
│   sec:alerts    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Actions Worker  │ (sends Slack notification)
│   (Executor)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Agent Run JSON │ (sec:run:{runId})
│  Redis + Slack  │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│  Frontend UI    │
│  (auto-refresh) │
└─────────────────┘
```

## Pages

### 1. Incidents Page
- **URL**: http://localhost:8080/incidents
- **Auto-refresh**: Every 5 seconds
- **Sort**: Newest first (by lastSeen)
- **Badge**: "Live" indicator
- **Data source**: Backend API → Redis

### 2. Agent Runs Page
- **URL**: http://localhost:8080/agent-runs
- **Auto-refresh**: Every 5 seconds
- **Shows**: 
  - Which agents acted (Detector, Planner, Executor)
  - Timeline of steps
  - Tool calls with status
  - Agent attribution
- **Data source**: Backend API → Redis (`sec:run:*`)

## Current Status

### Incidents
- ✅ Generated every 5 seconds
- ✅ Stored in Redis (`sec:incident:*`)
- ✅ Displayed on dashboard
- ✅ Auto-refresh working
- ✅ Sorted newest first

### Agent Runs
- ✅ Created for each incident
- ✅ Planner step tracked (rule evaluation)
- ✅ Executor step tracked (Slack notification)
- ✅ Agent attribution working
- ✅ Displayed on Agent Runs page
- ✅ Auto-refresh working

### Slack Integration
- ⚠️ Simulated (Composio API endpoint not reachable)
- ✅ Fallback logging works
- ✅ Agent Run tracking works
- ℹ️ Set `COMPOSIO_API_KEY` and connect workspace for real Slack

## Monitoring

### Check Services
```bash
# List running services
ps aux | grep -E "(tsx server|tsx tools)" | grep -v grep

# Check logs
tail -f /tmp/backend.log
tail -f /tmp/rules-worker.log
tail -f /tmp/actions-worker.log
tail -f /tmp/ingest.log
```

### Check Redis Data
```bash
# Count incidents
redis-cli KEYS "sec:incident:*" | wc -l

# Count agent runs
redis-cli KEYS "sec:run:*" | wc -l

# Check latest incident
redis-cli --scan --pattern "sec:incident:*" | head -1 | xargs redis-cli JSON.GET

# Check latest agent run
redis-cli --scan --pattern "sec:run:*" | head -1 | xargs redis-cli JSON.GET
```

### API Endpoints
```bash
# Health check
curl http://localhost:3001/health

# Get incidents
curl http://localhost:3001/api/incidents | jq '. | length'

# Get agent runs
curl http://localhost:3001/api/agent-runs | jq '. | length'
```

## Performance

- **Incident generation rate**: 5 seconds per incident
- **Frontend refresh rate**: 5 seconds
- **Redis**: Auto-eviction enabled (LRU)
- **Total incidents**: Growing
- **Total agent runs**: Growing (1 per incident)

## Troubleshooting

### No incidents showing
1. Check if ingestor is running: `ps aux | grep live-feeds`
2. Check ingestor logs: `tail -f /tmp/ingest.log`
3. Check Redis: `redis-cli KEYS "sec:incident:*"`

### No agent runs showing
1. Check if workers are running: `ps aux | grep workers`
2. Check worker logs: `tail -f /tmp/rules-worker.log /tmp/actions-worker.log`
3. Check Redis: `redis-cli KEYS "sec:run:*"`

### Frontend not updating
1. Check browser console for errors
2. Verify backend is running: `curl http://localhost:3001/health`
3. Check auto-refresh is enabled (should see "Live" badge)
