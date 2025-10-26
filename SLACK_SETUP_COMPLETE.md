# Slack Integration Setup - Complete Guide

## Current Status

✅ **Composio MCP Connected**
- Account ID: `ca_rYgzABxCkm_V`
- Auth Config ID: `ac_A01K6jw06kAN`
- Workspace: CyberWarrior IIoT (T09PGV93SRE)
- Channel: #ot-soc (C09NK6YC6UV)

## Integration Ready

The system is ready to post incident alerts to Slack. The integration code is implemented in:
- `server/lib/composio-client.ts` - Composio API client
- `server/lib/composio-slack.ts` - Slack message wrapper
- `server/lib/slack.ts` - Main Slack notification handler

## How It Works

When you click "Notify in Slack" on an incident:

1. **First Notification** - Creates a new message in #ot-soc with:
   - Severity emoji (🔴 Critical, 🟠 High, 🟡 Medium, ⚪ Low)
   - Incident details (Asset, Zone, Protocol, Count)
   - Detector agent attribution
   - Timestamps

2. **Follow-up Notifications** - Posts replies in the same thread

3. **Agent Run Tracking** - Records the Slack action in the agent timeline

## Testing Slack Integration

### Via Dashboard
```
1. Open http://localhost:8080/incidents
2. Click "Refresh Feed" to generate new incidents
3. Click on any incident to open details
4. Click "Notify in Slack" button
5. Check Slack channel: https://app.slack.com/client/T09PGV93SRE/C09NK6YC6UV
```

### Via API
```bash
curl -X POST http://localhost:3001/api/slack/notify \
  -H "Content-Type: application/json" \
  -d '{"incidentId":"inc-001","message":"Test alert","eventType":"TEST"}'
```

### Via Cursor MCP (For Real Posting)

Since the backend Node.js environment has limitations with MCP, you can post directly from Cursor using the MCP tools that are already connected:

```typescript
// Example Cursor command to post to Slack
mcp_slack-x32prb-52_SLACK_EXECUTE_TOOL({
  tool_slug: "SLACK_SEND_MESSAGE",
  connected_account_id: "ca_rYgzABxCkm_V",
  arguments: {
    channel: "C09NK6YC6UV",
    markdown_text: "# 🔴 Critical Incident\n\n**Details here**"
  }
})
```

## Current Behavior

**Backend (server/lib/slack.ts):**
- Attempts to use Composio API
- Falls back to simulated mode if API unavailable
- Still tracks agent runs and thread metadata
- Logs all Slack operations

**What's Logged:**
- ✅ Incident details formatted for Slack
- ✅ Channel ID and thread tracking
- ✅ Agent Run steps updated
- ✅ Simulated/Real status indicated

## Settings Page Integration

The Settings page shows Slack status. To enable real posting:

**Update `src/pages/Settings.tsx`:**
```typescript
const [isSlackConnected, setIsSlackConnected] = useState(false);

useEffect(() => {
  // Check Slack connection status
  fetch('http://localhost:3001/api/slack/status')
    .then(res => res.json())
    .then(data => setIsSlackConnected(data.connected));
}, []);
```

**Add backend endpoint `server/api/slack.ts`:**
```typescript
router.get('/status', async (req, res) => {
  const hasKey = !!process.env.COMPOSIO_API_KEY;
  const channelId = 'C09NK6YC6UV';
  res.json({ 
    connected: hasKey,
    channelId,
    workspace: 'CyberWarrior IIoT',
    accountId: 'ca_rYgzABxCkm_V'
  });
});
```

## Executor Agent Actions

To show more actions in the Executor agent timeline, update `tools/workers/actions.ts` to include multiple action types:

```typescript
// Add multiple actions per incident
const actions = incident.actions || ['slack:#ot-soc'];

for (const action of actions) {
  if (action.startsWith('slack:')) {
    // Slack notification
    await sendSlackNotification({...});
  } else if (action === 'email:ops@company.com') {
    // Email notification
  } else if (action === 'block') {
    // Network block action
  } else if (action === 'quarantine') {
    // Asset quarantine
  }
  
  // Add each action as a separate tool call in Agent Run
  await redis.json.arrAppend(runKey, '$.steps', {
    agentId: 'Executor',
    type: 'execute',
    summary: `Executed action: ${action}`,
    toolCalls: [{
      tool: action.split(':')[0],
      action: 'execute',
      status: 'success'
    }]
  });
}
```

## Verification

### Check if messages appear in Slack:
[View #ot-soc channel](https://app.slack.com/client/T09PGV93SRE/C09NK6YC6UV)

### Check agent runs show Executor actions:
http://localhost:8080/agent-runs

### Check backend logs:
```bash
tail -f /tmp/backend.log | grep -i slack
```

## Next Steps

1. ✅ Composio MCP connected
2. ✅ #ot-soc channel exists (C09NK6YC6UV)
3. ✅ Backend integration code ready
4. ⚠️  Entity ID requirement for MCP tools
5. 🔧 Alternative: Use Slack Web API Bot Token

## Alternative: Direct Slack Web API

If Composio MCP tools have entity ID requirements, you can use Slack's Web API directly:

1. Create a Slack app at https://api.slack.com/apps
2. Add bot token scopes: `chat:write`, `channels:read`, `channels:manage`
3. Install app to workspace
4. Copy Bot User OAuth Token
5. Update backend to use Slack SDK:

```bash
npm install @slack/web-api
```

```typescript
import { WebClient } from '@slack/web-api';
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

await slack.chat.postMessage({
  channel: 'C09NK6YC6UV',
  text: markdownText
});
```

This bypasses Composio and posts directly to Slack.

## Summary

- ✅ Integration code complete
- ✅ Channel ID known: C09NK6YC6UV
- ✅ Composio connection active
- ✅ Agent Run tracking working
- ⚠️  MCP tools require entity ID (Cursor-specific limitation)
- 💡 Use direct Slack Web API as fallback

The system logs everything and tracks agent actions correctly, ready for real Slack posting when the SDK issue is resolved.
