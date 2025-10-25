import { config } from '../config';
import { Incident, RuleDef } from '../types';

export interface ComposioResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  requestId?: string;
}

export interface SlackMessage {
  channel: string;
  text: string;
  attachments?: Array<{
    color: string;
    title: string;
    text: string;
    fields?: Array<{
      title: string;
      value: string;
      short: boolean;
    }>;
  }>;
}

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

export interface ActionResponse {
  actionId: string;
  status: 'success' | 'failed' | 'pending';
  result?: unknown;
  error?: string;
}

export class ComposioAPI {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = config.apis.composio.baseUrl;
    this.apiKey = config.apis.composio.apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ComposioResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();

      return {
        success: true,
        data,
        requestId: response.headers.get('X-Request-ID') || undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Slack Integration
  async sendSlackMessage(message: SlackMessage): Promise<ComposioResponse<ActionResponse>> {
    return this.request<ActionResponse>('/actions/slack/send-message', {
      method: 'POST',
      body: JSON.stringify(message),
    });
  }

  async postToSlackChannel(channel: string, text: string): Promise<ComposioResponse<ActionResponse>> {
    return this.sendSlackMessage({ channel, text });
  }

  // Email Integration
  async sendEmail(email: EmailMessage): Promise<ComposioResponse<ActionResponse>> {
    return this.request<ActionResponse>('/actions/email/send', {
      method: 'POST',
      body: JSON.stringify(email),
    });
  }

  // Incident-specific integrations
  async notifyIncident(incident: Incident, actions: string[]): Promise<ActionResponse[]> {
    const results: ActionResponse[] = [];

    for (const action of actions) {
      try {
        let response: ComposioResponse<ActionResponse>;

        if (action.startsWith('slack:')) {
          const channel = action.replace('slack:', '');
          const message = this.formatIncidentSlackMessage(incident, channel);
          response = await this.sendSlackMessage(message);
        } else if (action.startsWith('email:')) {
          const to = action.replace('email:', '');
          const email = this.formatIncidentEmail(incident, to);
          response = await this.sendEmail(email);
        } else if (action === 'block') {
          // Network block action - TODO: Implement with Composio network actions
          console.log('TODO: Implement network block action');
          results.push({
            actionId: `block-${incident.id}`,
            status: 'pending',
            error: 'Not implemented yet',
          });
          continue;
        } else if (action === 'quarantine') {
          // Asset quarantine action - TODO: Implement with Composio asset management
          console.log('TODO: Implement asset quarantine action');
          results.push({
            actionId: `quarantine-${incident.id}`,
            status: 'pending',
            error: 'Not implemented yet',
          });
          continue;
        } else if (action.startsWith('alert:')) {
          // Alert action - TODO: Implement with Composio alerting
          console.log(`TODO: Implement alert action to ${action.replace('alert:', '')}`);
          results.push({
            actionId: `alert-${incident.id}`,
            status: 'pending',
            error: 'Not implemented yet',
          });
          continue;
        } else {
          results.push({
            actionId: `unknown-${incident.id}`,
            status: 'failed',
            error: `Unknown action: ${action}`,
          });
          continue;
        }

        if (response.success && response.data) {
          results.push(response.data);
        } else {
          results.push({
            actionId: `${action}-${incident.id}`,
            status: 'failed',
            error: response.error || 'Unknown error',
          });
        }
      } catch (error) {
        results.push({
          actionId: `${action}-${incident.id}`,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  private formatIncidentSlackMessage(incident: Incident, channel?: string): SlackMessage {
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
      text: `${severityEmoji} [${incident.severity.toUpperCase()}] ${vectorLabel} on ${incident.asset.name} (${incident.asset.zone})`,
      attachments: [
        {
          color: this.getSeverityColor(incident.severity),
          title: 'Incident Details',
          text: `Protocol: ${incident.protocol || 'N/A'}${detailsStr}`,
          fields: [
            {
              title: 'First Seen',
              value: incident.firstSeen,
              short: true,
            },
            {
              title: 'Last Seen',
              value: incident.lastSeen,
              short: true,
            },
            {
              title: 'Count',
              value: incident.count.toString(),
              short: true,
            },
            {
              title: 'Source',
              value: incident.source,
              short: true,
            },
          ],
        },
      ],
    };
  }

  private formatIncidentEmail(incident: Incident, to: string): EmailMessage {
    const severityEmoji = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '⚪',
    }[incident.severity];

    const vectorLabel = incident.vector.replace(/_/g, ' ').toUpperCase();

    const subject = `${severityEmoji} [${incident.severity.toUpperCase()}] ${vectorLabel} - ${incident.asset.name}`;

    const html = `
      <html>
        <body style="font-family: Arial, sans-serif;">
          <h2 style="color: ${this.getSeverityColor(incident.severity)}">
            ${vectorLabel}
          </h2>
          <table style="border-collapse: collapse; width: 100%;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Asset:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${incident.asset.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Zone:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${incident.asset.zone}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Protocol:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${incident.protocol || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Severity:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">
                <span style="color: ${this.getSeverityColor(incident.severity)};">
                  ${incident.severity.toUpperCase()}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>First Seen:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${incident.firstSeen}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Last Seen:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${incident.lastSeen}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Count:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">${incident.count}</td>
            </tr>
          </table>
        </body>
      </html>
    `;

    return {
      to,
      subject,
      body: `Incident: ${vectorLabel}\n\nAsset: ${incident.asset.name}\nZone: ${incident.asset.zone}\nSeverity: ${incident.severity}\nFirst Seen: ${incident.firstSeen}\nLast Seen: ${incident.lastSeen}\nCount: ${incident.count}`,
      html,
    };
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical':
        return '#FF0000';
      case 'high':
        return '#FF8800';
      case 'medium':
        return '#FFAA00';
      case 'low':
        return '#888888';
      default:
        return '#000000';
    }
  }

  // Rule execution
  async executeRule(rule: RuleDef, incident: Incident): Promise<ActionResponse[]> {
    if (!config.features.enableComposio || !this.apiKey) {
      console.warn('Composio API not configured, skipping rule execution');
      return [];
    }

    return this.notifyIncident(incident, rule.actions);
  }

  // Health check
  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    if (!config.features.enableComposio || !this.apiKey) {
      return { healthy: false, error: 'Composio API not configured' };
    }

    try {
      const response = await this.request('/health');
      return {
        healthy: response.success,
        error: response.error,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const composioAPI = new ComposioAPI();
