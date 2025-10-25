import { getRedis } from './redis';

// Slack API integration using Composio SDK (or direct Slack API)
export async function sendSlackNotification(params: {
  incidentId: string;
  message: string;
  eventType?: string;
}): Promise<{ ok: boolean; ts?: string; simulated: boolean }> {
  const redis = await getRedis();
  const { incidentId, message, eventType = 'STATUS_CHANGE' } = params;

  // Get incident
  const incident = await redis.json.get(`sec:incident:${incidentId}`) as any;
  if (!incident) {
    return { ok: false, simulated: true };
  }

  // Get or create Slack metadata
  const metaKey = `sec:incident:${incidentId}:slack`;
  let meta = await redis.json.get(metaKey) as any;

  const composioApiKey = process.env.COMPOSIO_API_KEY;

  if (!composioApiKey) {
    // Simulated mode
    if (!meta?.ts) {
      const ts = Date.now().toString();
      meta = { channelId: '#ot-soc', ts };
      await redis.json.set(metaKey, '$', meta);
      console.log(`📢 Slack [SIMULATED]: New incident ${incidentId} posted to ${meta.channelId}`);
    } else {
      console.log(`📢 Slack [SIMULATED]: Update to incident ${incidentId}`);
    }
    return { ok: true, ts: meta.ts, simulated: true };
  }

  // Real Composio integration
  try {
    const composioUrl = 'https://api.composio.dev/v1';
    const headers = {
      'Authorization': `Bearer ${composioApiKey}`,
      'Content-Type': 'application/json',
    };

    if (!meta?.ts) {
      // First post - create root message
      const blocks = [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `[${incident.severity.toUpperCase()}] ${incident.vector.replace(/_/g, ' ')} on ${incident.asset?.name || 'Unknown Asset'}`,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Protocol:*\n${incident.protocol || 'N/A'}` },
            { type: 'mrkdwn', text: `*Count:*\n${incident.count}` },
            { type: 'mrkdwn', text: `*First Seen:*\n${incident.firstSeen}` },
            { type: 'mrkdwn', text: `*Last Seen:*\n${incident.lastSeen}` },
          ],
        },
      ];

      const response = await fetch(`${composioUrl}/actions/slack/postMessage`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          channel: '#ot-soc',
          blocks,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const ts = data.ts || data.data?.ts || Date.now().toString();
        meta = { channelId: '#ot-soc', ts };
        await redis.json.set(metaKey, '$', meta);
        console.log(`📢 Slack [REAL]: New incident ${incidentId} posted to ${meta.channelId}`);
        return { ok: true, ts, simulated: false };
      }
    } else {
      // Thread reply
      const response = await fetch(`${composioUrl}/actions/slack/postMessage`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          channel: meta.channelId,
          text: message || `Event: ${eventType}`,
          thread_ts: meta.ts,
        }),
      });

      if (response.ok) {
        console.log(`📢 Slack [REAL]: Update to incident ${incidentId}`);
        return { ok: true, ts: meta.ts, simulated: false };
      }
    }
  } catch (error) {
    console.error('Composio API error:', error);
  }

  // Fallback to simulated
  return { ok: true, ts: meta?.ts || Date.now().toString(), simulated: true };
}
