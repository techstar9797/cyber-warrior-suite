import { Incident, RuleDef } from './types';
import { composioAPI } from './api/composio';
import { config } from './config';

// Real Composio integration with fallback to stub
export async function postIncidentToSlack(incident: Incident, channel?: string): Promise<{ ok: boolean; simulated: boolean }> {
  // Try backend API first
  try {
    const response = await fetch('http://localhost:3001/api/slack/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incidentId: incident.id,
        message: `Incident ${incident.id} - ${incident.vector}`,
        eventType: 'NOTIFICATION',
      }),
    });

    if (response.ok) {
      const result = await response.json();
      return result;
    }
  } catch (error) {
    console.warn('Backend API not available, using stub:', error);
  }

  // Fallback to stub
  const message = formatSlackMessage(incident, channel);
  console.log('SLACK STUB →', message);

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  return { ok: true, simulated: true };
}

// Phase 3 TODOs for Composio integration
export const composioTODOs = {
  // 1. Authentication & Setup
  setup: [
    'Install @composio/core package',
    'Configure Composio API credentials in environment variables',
    'Initialize Composio client with proper authentication',
  ],

  // 2. Slack Integration
  slack: [
    'Integrate with Slack using Composio Slack actions',
    'Replace stub implementation with actual Slack API calls',
    'Handle Slack authentication and workspace connection',
    'Support multiple Slack channels based on severity/incident type',
  ],

  // 3. Email Integration
  email: [
    'Add email functionality for incident notifications',
    'Support multiple email templates based on incident severity',
    'Configure SMTP settings or use email service provider',
    'Add email address validation and management',
  ],

  // 4. Rule Engine Integration
  ruleEngine: [
    'Connect rule evaluation with Composio actions',
    'Trigger actions based on rule conditions (if/then logic)',
    'Support dynamic action execution based on rule definitions',
    'Add action result logging and error handling',
  ],

  // 5. Action Types to Implement
  actions: [
    'Slack message posting with rich formatting',
    'Email sending with HTML templates',
    'SMS notifications for critical incidents',
    'Jira ticket creation for incident tracking',
    'PagerDuty incident creation',
    'Microsoft Teams notifications',
    'Custom webhook integrations',
  ],

  // 6. Error Handling & Monitoring
  monitoring: [
    'Add comprehensive error handling for failed actions',
    'Implement action retry logic with exponential backoff',
    'Add action execution logging to Redis',
    'Create monitoring dashboard for action success/failure rates',
    'Add alerting for failed action executions',
  ],

  // 7. Configuration Management
  config: [
    'Create configuration interface for action settings',
    'Support per-rule action configuration',
    'Add validation for action parameters',
    'Support action enable/disable functionality',
  ],
};

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
    const details = incident.details as Record<string, unknown>;
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

// Real rule execution with Composio integration
export async function executeRuleActions(rule: RuleDef, incident: Incident): Promise<void> {
  // Try real API if configured
  if (config.features.enableComposio && config.apis.composio.apiKey) {
    try {
      const results = await composioAPI.executeRule(rule, incident);
      console.log(`Executed ${results.length} actions for rule "${rule.name}"`);
      results.forEach(result => {
        if (result.status === 'failed') {
          console.error(`Action ${result.actionId} failed:`, result.error);
        }
      });
      return;
    } catch (error) {
      console.error('Failed to execute rule via Composio:', error);
      // Fall through to stub
    }
  }

  // Fallback to stub
  console.log(`STUB: Execute actions for rule "${rule.name}":`, rule.actions);

  for (const action of rule.actions) {
    await executeAction(action, incident);
  }
}

async function executeAction(action: string, incident: Incident): Promise<void> {
  console.log(`STUB: Execute action "${action}" for incident ${incident.id}`);

  if (action.startsWith('slack:')) {
    const channel = action.replace('slack:', '');
    await postIncidentToSlack(incident, channel);
  } else if (action.startsWith('email:')) {
    console.log(`STUB: Send email to ${action.replace('email:', '')}`);
  } else if (action === 'block') {
    console.log('STUB: Execute network block action');
  } else if (action === 'quarantine') {
    console.log('STUB: Execute asset quarantine action');
  } else if (action.startsWith('alert:')) {
    console.log(`STUB: Send alert to ${action.replace('alert:', '')}`);
  }
}

function formatSlackMessageText(incident: Incident): string {
  const severityEmoji = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '⚪',
  }[incident.severity];

  const vectorLabel = incident.vector.replace(/_/g, ' ').toUpperCase();

  let detailsStr = '';
  if (incident.details) {
    const details = incident.details as Record<string, unknown>;
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

  return `${severityEmoji} [${incident.severity.toUpperCase()}] ${vectorLabel} on ${incident.asset.name} (${incident.asset.zone})
Protocol: ${incident.protocol || 'N/A'}${detailsStr}
First: ${incident.firstSeen}  Last: ${incident.lastSeen}  Count: ${incident.count}
Source: ${incident.source}`;
}
