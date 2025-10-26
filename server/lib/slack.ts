import { getRedis } from './redis';
import { postSlackMessage, ensureOtSocChannel } from './slack-real';

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

  // Ensure #ot-soc channel exists
  const { channelId } = await ensureOtSocChannel();

  if (!meta?.ts) {
    // First post - create root message with formatted markdown
    const severityEmoji = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '⚪',
    }[incident.severity] || '⚫';

    const markdownText = `# ${severityEmoji} [${incident.severity.toUpperCase()}] ${incident.vector.replace(/_/g, ' ').toUpperCase()}

**Asset**: ${incident.asset?.name || 'Unknown'}  
**Zone**: ${incident.asset?.zone || 'N/A'}  
**Protocol**: ${incident.protocol || 'N/A'}  
**Count**: ${incident.count}  

**First Seen**: ${incident.firstSeen}  
**Last Seen**: ${incident.lastSeen}  

**Detector**: ${incident.detector || 'Unknown'}  
**Incident ID**: \`${incidentId}\``;

    const result = await postSlackMessage({
      channel: channelId,
      markdown_text: markdownText,
    });

    if (result.success && result.ts) {
      meta = { channelId, ts: result.ts, permalink: result.permalink };
      await redis.json.set(metaKey, '$', meta);
      console.log(`📢 Slack [REAL]: New incident ${incidentId} posted to channel ${channelId}`);
      console.log(`   Link: ${result.permalink}`);
      return { ok: true, ts: result.ts, simulated: false };
    } else {
      // Fallback to simulated
      const ts = Date.now().toString();
      meta = { channelId, ts };
      await redis.json.set(metaKey, '$', meta);
      console.log(`📢 Slack [SIMULATED]: New incident ${incidentId}`);
      return { ok: true, ts, simulated: true };
    }
  } else {
    // Thread reply
    const result = await postSlackMessage({
      channel: meta.channelId,
      text: message || `Update: ${eventType}`,
      thread_ts: meta.ts,
    });

    if (result.success) {
      console.log(`📢 Slack [REAL]: Update to incident ${incidentId} in thread`);
      return { ok: true, ts: meta.ts, simulated: false };
    } else {
      console.log(`📢 Slack [SIMULATED]: Update to incident ${incidentId}`);
      return { ok: true, ts: meta.ts, simulated: true };
    }
  }
}
