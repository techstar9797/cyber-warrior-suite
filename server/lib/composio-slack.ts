/**
 * Real Composio Slack Integration
 * Based on https://docs.composio.dev/toolkits/slack
 */
import { ensureOtSocChannel, postSlackMessage as composioPostMessage } from './composio-client';

interface SlackMessageParams {
  channel: string;
  markdown_text?: string;
  text?: string;
  thread_ts?: string;
}

interface SlackResponse {
  success: boolean;
  data?: any;
  error?: string;
  ts?: string;
}

// Cached channel ID
let otSocChannelId: string | null = null;

async function getOtSocChannelId(): Promise<string> {
  if (otSocChannelId) return otSocChannelId;
  
  const result = await ensureOtSocChannel();
  otSocChannelId = result.channelId;
  return otSocChannelId;
}

export async function sendSlackMessage(params: SlackMessageParams): Promise<SlackResponse> {
  const composioApiKey = process.env.COMPOSIO_API_KEY;
  
  if (!composioApiKey) {
    console.log('📢 SLACK [SIMULATED]: No API key');
    return { success: true, ts: Date.now().toString(), data: { simulated: true } };
  }

  try {
    // Ensure channel exists
    const channelId = await getOtSocChannelId();
    
    // Use real channel ID instead of name
    const messageParams = {
      ...params,
      channel: params.thread_ts ? params.channel : channelId,
    };
    
    const result = await composioPostMessage(messageParams);
    
    if (result.success) {
      console.log('📢 SLACK [REAL]: Message sent', result.ts);
      return {
        success: true,
        ts: result.ts,
        data: { simulated: false },
      };
    }
    
    return result;
  } catch (error) {
    console.error('Failed to send Slack message:', error);
    return { success: false, error: String(error) };
  }
}

export async function findSlackChannel(query: string): Promise<any> {
  if (!COMPOSIO_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(`${COMPOSIO_BASE_URL}/actions/SLACK_FIND_CHANNELS/execute`, {
      method: 'POST',
      headers: {
        'X-API-Key': COMPOSIO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        connectedAccountId: 'ca_PniKNu3vBg6z',
        input: {
          search_query: query,
          exclude_archived: true,
        },
      }),
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    return result.data?.channels?.[0] || null;
  } catch (error) {
    console.error('Failed to find Slack channel:', error);
    return null;
  }
}

export async function checkSlackConnection(): Promise<{ connected: boolean; channelId?: string }> {
  if (!COMPOSIO_API_KEY) {
    return { connected: false };
  }

  try {
    // Try to find #ot-soc channel to verify connection
    const channel = await findSlackChannel('ot-soc');
    return {
      connected: !!channel,
      channelId: channel?.id || 'C09NK6YC6UV', // Fallback to provided channel ID
    };
  } catch (error) {
    return { connected: false };
  }
}

