/**
 * Composio Client for Slack Integration
 * Connection ID: ca_PniKNu3vBg6z
 * Workspace: CyberWarrior IIoT (T09PGV93SRE)
 */

const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY || 'ak_PkU0YUmr6D5Neg_C3iDQ';
const CONNECTED_ACCOUNT_ID = 'ca_rYgzABxCkm_V'; // MCP Slack account
const AUTH_CONFIG_ID = 'ac_A01K6jw06kAN'; // Auth config for Slack
const COMPOSIO_BASE_URL = 'https://backend.composio.dev/api/v3';

interface ComposioResponse {
  data?: any;
  error?: string;
  successful: boolean;
}

async function executeComposioTool(toolSlug: string, input: any): Promise<ComposioResponse> {
  try {
    const response = await fetch(`${COMPOSIO_BASE_URL}/actions/${toolSlug}/execute`, {
      method: 'POST',
      headers: {
        'X-API-Key': COMPOSIO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        connectedAccountId: CONNECTED_ACCOUNT_ID,
        input,
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error(`Composio ${toolSlug} error:`, result);
      return { successful: false, error: result.error || `HTTP ${response.status}` };
    }

    return { successful: true, data: result.data };
  } catch (error) {
    console.error(`Composio ${toolSlug} failed:`, error);
    return { successful: false, error: String(error) };
  }
}

export async function ensureOtSocChannel(): Promise<{ channelId: string; created: boolean }> {
  // Try to find existing #ot-soc channel
  const findResult = await executeComposioTool('SLACK_FIND_CHANNELS', {
    search_query: 'ot-soc',
    exclude_archived: true,
  });

  if (findResult.successful && findResult.data?.channels?.length > 0) {
    const channel = findResult.data.channels[0];
    console.log(`✅ Found existing #ot-soc channel: ${channel.id}`);
    return { channelId: channel.id, created: false };
  }

  // Channel doesn't exist, create it
  console.log('Creating #ot-soc channel...');
  const createResult = await executeComposioTool('SLACK_CREATE_CHANNEL', {
    name: 'ot-soc',
    is_private: false,
  });

  if (createResult.successful && createResult.data?.channel?.id) {
    const channelId = createResult.data.channel.id;
    console.log(`✅ Created #ot-soc channel: ${channelId}`);
    
    // Set channel topic
    await executeComposioTool('SLACK_SET_THE_TOPIC_OF_A_CONVERSATION', {
      channel: channelId,
      topic: 'OT/ICS Security Incident Notifications',
    });
    
    // Set channel purpose
    await executeComposioTool('SLACK_SET_A_CONVERSATION_S_PURPOSE', {
      channel: channelId,
      purpose: 'Real-time alerts from Cyber Warrior Suite for OT/ICS security incidents, malicious IPs, and threat intelligence.',
    });
    
    return { channelId, created: true };
  }

  // Fallback to known channel ID if creation fails
  console.warn('Failed to create channel, using fallback ID');
  return { channelId: 'C09NK6YC6UV', created: false };
}

export async function postSlackMessage(params: {
  channel: string;
  markdown_text?: string;
  text?: string;
  thread_ts?: string;
}): Promise<{ success: boolean; ts?: string; error?: string }> {
  const result = await executeComposioTool('SLACK_SEND_MESSAGE', params);
  
  if (result.successful) {
    return {
      success: true,
      ts: result.data?.ts || Date.now().toString(),
    };
  }
  
  return {
    success: false,
    error: result.error,
  };
}

