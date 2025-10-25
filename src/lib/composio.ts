import { Incident } from './types';

export async function postIncidentToSlack(incident: Incident, channel?: string): Promise<{ ok: boolean; simulated: boolean }> {
  // Phase 1 stub: simulate success and log payload to console
  const message = formatSlackMessage(incident, channel);
  console.log('SLACK STUB →', message);
  
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  
  return { ok: true, simulated: true };
}

function formatSlackMessage(incident: Incident, channel?: string) {
  const channelName = channel || '#ot-soc';
  const severityEmoji = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '⚪',
  }[incident.severity];

  const vectorLabel = incident.vector.replace(/_/g, ' ').toUpperCase();
  
  let detailsStr = '';
  if (incident.details) {
    const details = incident.details as any;
    if (details.functionCode) {
      detailsStr = `\nFunction: ${details.functionCode}  |  Register: ${details.register}`;
      if (details.prevValue !== undefined) {
        detailsStr += `\nDetails: prev=${details.prevValue} → new=${details.newValue} ${details.unit || ''}`;
      }
    } else if (details.mqttTopic) {
      detailsStr = `\nTopic: ${details.mqttTopic}  |  Rate: ${details.ratePerMin}/min (normal: ${details.normalRate})`;
    } else if (details.srcIP) {
      detailsStr = `\nSrc: ${details.srcIP} → Dest: ${details.destIP}:${details.destPort}`;
    }
  }

  return {
    channel: channelName,
    text: `${severityEmoji} [${incident.severity.toUpperCase()}] ${vectorLabel} on ${incident.asset.name} (${incident.asset.zone})
Protocol: ${incident.protocol || 'N/A'}${detailsStr}
First: ${incident.firstSeen}  Last: ${incident.lastSeen}  Count: ${incident.count}
Source: ${incident.source}`,
  };
}
