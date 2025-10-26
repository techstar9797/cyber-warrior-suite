/**
 * Real Slack Integration using Slack Web API
 * Token: xoxp-... (user token)
 * Channel: #ot-soc (C09NK6YC6UV)
 */
import { WebClient } from '@slack/web-api';

const SLACK_TOKEN = process.env.SLACK_ACCESS_TOKEN || 'xoxp-9609006577953-9609006595617-9600201247300-0cf36bb7a59ce089d4d558ede1d4e974';
const OT_SOC_CHANNEL = process.env.SLACK_OT_SOC_CHANNEL || 'C09NSLFG2GL'; // Use newly created channel

// Initialize Slack client
const slackClient = new WebClient(SLACK_TOKEN);

interface PostMessageResult {
  success: boolean;
  ts?: string;
  error?: string;
  permalink?: string;
}

export async function postSlackMessage(params: {
  channel?: string;
  text?: string;
  markdown_text?: string;
  thread_ts?: string;
}): Promise<PostMessageResult> {
  try {
    const channel = params.channel || OT_SOC_CHANNEL;
    const text = params.markdown_text || params.text || 'No message content';
    
    const result = await slackClient.chat.postMessage({
      channel,
      text,
      thread_ts: params.thread_ts,
    });

    console.log(`✅ SLACK [REAL]: Message posted to ${channel}`);
    console.log(`   TS: ${result.ts}`);

    // Get permalink
    let permalink;
    if (result.ts) {
      try {
        const linkResult = await slackClient.chat.getPermalink({
          channel,
          message_ts: result.ts as string,
        });
        permalink = linkResult.permalink as string;
      } catch (e) {
        console.warn('Could not get permalink:', e);
      }
    }

    return {
      success: true,
      ts: result.ts as string,
      permalink,
    };
  } catch (error: any) {
    console.error('❌ Slack API error:', error.message || error);
    return {
      success: false,
      error: error.message || String(error),
    };
  }
}

export async function ensureOtSocChannel(): Promise<{ channelId: string; name: string }> {
  try {
    // Verify channel exists
    const info = await slackClient.conversations.info({
      channel: OT_SOC_CHANNEL,
    });

    if (info.channel) {
      console.log(`✅ #ot-soc channel verified: ${OT_SOC_CHANNEL}`);
      return {
        channelId: OT_SOC_CHANNEL,
        name: info.channel.name || 'ot-soc',
      };
    }
  } catch (error: any) {
    if (error.data?.error === 'channel_not_found') {
      // Create the channel
      console.log('Creating #ot-soc channel...');
      try {
        const result = await slackClient.conversations.create({
          name: 'ot-soc',
          is_private: false,
        });

        if (result.channel?.id) {
          const channelId = result.channel.id;
          console.log(`✅ Created #ot-soc channel: ${channelId}`);
          
          // Set topic
          await slackClient.conversations.setTopic({
            channel: channelId,
            topic: 'OT/ICS Security Incident Notifications',
          });
          
          // Set purpose
          await slackClient.conversations.setPurpose({
            channel: channelId,
            purpose: 'Real-time alerts from Cyber Warrior Suite for security incidents',
          });
          
          return { channelId, name: 'ot-soc' };
        }
      } catch (createError) {
        console.error('Failed to create channel:', createError);
      }
    }
  }

  // Fallback
  return { channelId: OT_SOC_CHANNEL, name: 'ot-soc' };
}

export async function getSlackStatus(): Promise<{
  connected: boolean;
  workspace?: string;
  channelId?: string;
  user?: string;
}> {
  try {
    const authTest = await slackClient.auth.test();
    
    return {
      connected: true,
      workspace: authTest.team as string,
      channelId: OT_SOC_CHANNEL,
      user: authTest.user as string,
    };
  } catch (error) {
    return { connected: false };
  }
}

