// Configuration module for secure API keys and environment variables
// In production, these should be set via environment variables or secure key management

// Helper to safely access environment variables (works in both Node.js and browser)
const getEnv = (key: string, defaultValue = ''): string => {
  // In browser (Vite), use import.meta.env
  if (typeof window !== 'undefined') {
    try {
      const env = (import.meta as any).env;
      if (env && env[key]) {
        return env[key];
      }
    } catch {
      // Ignore
    }
  }
  
  // In Node.js, use process.env
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || defaultValue;
  }
  
  return defaultValue;
};

export const config = {
  // API Keys (secure - should never be committed to git)
  apis: {
    langcache: {
      apiKey: getEnv('VITE_LANGCACHE_API_KEY'),
      baseUrl: getEnv('VITE_LANGCACHE_BASE_URL', 'https://api.langcache.com'),
    },
    redis: {
      apiKey: getEnv('VITE_REDIS_API_KEY'),
      baseUrl: getEnv('VITE_REDIS_BASE_URL', 'https://api.redislabs.com/v1'),
    },
    composio: {
      apiKey: getEnv('VITE_COMPOSIO_API_KEY'),
      baseUrl: getEnv('VITE_COMPOSIO_BASE_URL', 'https://api.composio.dev'),
    },
  },

  // Redis Connection
  redis: {
    host: getEnv('VITE_REDIS_HOST', 'localhost'),
    port: parseInt(getEnv('VITE_REDIS_PORT', '6379'), 10),
    password: getEnv('VITE_REDIS_PASSWORD'),
    database: parseInt(getEnv('VITE_REDIS_DATABASE', '0'), 10),
  },

  // Slack Configuration
  slack: {
    workspaceUrl: getEnv('VITE_SLACK_WORKSPACE_URL', 'https://cyberwarrioriiot.slack.com'),
    botToken: getEnv('VITE_SLACK_BOT_TOKEN'),
  },

  // Development settings
  isDevelopment: getEnv('MODE', 'development') === 'development',
  isProduction: getEnv('MODE', 'development') === 'production',

  // Feature flags
  features: {
    useRealAPIs: getEnv('VITE_USE_REAL_APIS') === 'true',
    enableRedisCloud: getEnv('VITE_ENABLE_REDIS_CLOUD') === 'true',
    enableLangCache: getEnv('VITE_ENABLE_LANG_CACHE') === 'true',
    enableComposio: getEnv('VITE_ENABLE_COMPOSIO') === 'true',
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
