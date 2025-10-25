// Configuration module for secure API keys and environment variables
// In production, these should be set via environment variables or secure key management

export const config = {
  // API Keys (secure - should never be committed to git)
  apis: {
    langcache: {
      apiKey: process.env.LANGCACHE_API_KEY || '',
      baseUrl: process.env.LANGCACHE_BASE_URL || 'https://api.langcache.com',
    },
    redis: {
      apiKey: process.env.REDIS_API_KEY || '',
      baseUrl: process.env.REDIS_BASE_URL || 'https://api.redislabs.com/v1',
    },
    composio: {
      apiKey: process.env.COMPOSIO_API_KEY || '',
      baseUrl: process.env.COMPOSIO_BASE_URL || 'https://api.composio.dev',
    },
  },

  // Redis Connection
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    database: parseInt(process.env.REDIS_DATABASE || '0', 10),
  },

  // Slack Configuration
  slack: {
    workspaceUrl: process.env.SLACK_WORKSPACE_URL || 'https://cyberwarrioriiot.slack.com',
    botToken: process.env.SLACK_BOT_TOKEN || '',
  },

  // Development settings
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',

  // Feature flags
  features: {
    useRealAPIs: process.env.USE_REAL_APIS === 'true',
    enableRedisCloud: process.env.ENABLE_REDIS_CLOUD === 'true',
    enableLangCache: process.env.ENABLE_LANG_CACHE === 'true',
    enableComposio: process.env.ENABLE_COMPOSIO === 'true',
  },
};

// Validation function to ensure required API keys are available
export function validateConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (config.features.useRealAPIs) {
    if (!config.apis.langcache.apiKey) missing.push('LANGCACHE_API_KEY');
    if (!config.apis.redis.apiKey) missing.push('REDIS_API_KEY');
    if (!config.apis.composio.apiKey) missing.push('COMPOSIO_API_KEY');
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

// Log configuration (without exposing sensitive data)
export function logConfig(): void {
  console.log('🔧 Configuration loaded:');
  console.log(`   - Environment: ${config.isDevelopment ? 'development' : 'production'}`);
  console.log(`   - Redis Host: ${config.redis.host}:${config.redis.port}`);
  console.log(`   - Use Real APIs: ${config.features.useRealAPIs}`);
  console.log(`   - Features:`);
  console.log(`     * Redis Cloud: ${config.features.enableRedisCloud}`);
  console.log(`     * LangCache: ${config.features.enableLangCache}`);
  console.log(`     * Composio: ${config.features.enableComposio}`);

  if (config.features.useRealAPIs) {
    const validation = validateConfig();
    if (!validation.valid) {
      console.warn('⚠️  Missing API keys:', validation.missing.join(', '));
      console.warn('   Set these in your environment variables to use real APIs');
    } else {
      console.log('✅ All required API keys are configured');
    }
  }
}
