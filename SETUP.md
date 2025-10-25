# API Setup Guide

This document provides instructions for setting up API integrations for the Cyber Warrior Suite.

## Environment Variables

Create a `.env` file in the root directory with the following API keys:

```bash
# API Keys for Real Integrations
LANGCACHE_API_KEY=your_langcache_api_key_here
REDIS_API_KEY=your_redis_api_key_here
COMPOSIO_API_KEY=your_composio_api_key_here

# Redis Connection (for local Redis backend)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Development settings
NODE_ENV=development

# Feature Flags (set to 'true' to enable real APIs)
USE_REAL_APIS=false
ENABLE_REDIS_CLOUD=false
ENABLE_LANG_CACHE=false
ENABLE_COMPOSIO=false
```

## API Keys

### 1. LangCache API
- **Purpose**: Smart caching for incident analytics and asset telemetry
- **Documentation**: https://docs.langcache.com
- **Usage**: Automatically caches frequently accessed data to improve performance

### 2. Redis Cloud API
- **Purpose**: Cloud-managed Redis instances with monitoring
- **Documentation**: https://redis.io/docs/latest/operate/rc/api/
- **API Reference**: https://api.redislabs.com/v1/swagger-ui/index.html#/
- **Usage**: Monitor Redis Cloud database health and metrics

### 3. Composio API
- **Purpose**: Multi-app action orchestration (Slack, Email, etc.)
- **Documentation**: https://docs.composio.dev/docs/welcome
- **Usage**: Send incident notifications to Slack, email, and other integrations

## Enabling Real APIs

To enable real API integrations, set the following environment variables:

```bash
# Enable all real APIs
USE_REAL_APIS=true
ENABLE_REDIS_CLOUD=true
ENABLE_LANG_CACHE=true
ENABLE_COMPOSIO=true
```

The application will automatically:
1. Try to use real APIs if configured
2. Fall back to stub/mock implementations if APIs are not available
3. Log any errors or failures for debugging

## Testing API Integrations

### Test LangCache
```typescript
import { langCacheAPI } from './lib/api/langcache';

// Cache incident analytics
await langCacheAPI.cacheIncidentAnalytics('inc-001', { count: 5, severity: 'critical' });

// Retrieve cached data
const analytics = await langCacheAPI.getIncidentAnalytics('inc-001');
```

### Test Redis Cloud
```typescript
import { redisCloudAPI } from './lib/api/redis-cloud';

// Check database health
const health = await redisCloudAPI.checkDatabaseHealth();
console.log('Redis Cloud:', health);

// Get metrics
const metrics = await redisCloudAPI.getIncidentDatabaseMetrics();
```

### Test Composio
```typescript
import { composioAPI } from './lib/api/composio';

// Send Slack message
const response = await composioAPI.postToSlackChannel('#ot-soc', 'Test message');

// Execute rule actions
const results = await composioAPI.executeRule(ruleDef, incident);
```

## Security Notes

⚠️ **IMPORTANT**: 
- Never commit `.env` files to git
- API keys are automatically excluded via `.gitignore`
- Use environment variables in production deployments
- Rotate API keys regularly
- Use the least privilege principle for API access

## Troubleshooting

### APIs Not Working
1. Check that API keys are correctly set in `.env`
2. Verify feature flags are enabled (`USE_REAL_APIS=true`)
3. Check network connectivity and firewall rules
4. Review console logs for error messages
5. Verify API keys are valid and not expired

### Fallback to Stub
If APIs fail, the application will automatically fall back to stub implementations. Check logs for messages like:
- "SLACK STUB →" - Slack using stub
- "STUB: Execute action" - Rule execution using stub
- "No incidents found in Redis, falling back to JSON" - Redis using JSON fallback

### Common Issues

**Issue**: "API key not configured"
- **Solution**: Set the corresponding API key in `.env`

**Issue**: "Failed to send Slack message"
- **Solution**: Check Composio API key and Slack workspace configuration

**Issue**: "Redis connection failed"
- **Solution**: Ensure Redis is running (`docker-compose up -d`) or update Redis connection settings

## Additional Resources

- [LangCache Documentation](https://docs.langcache.com)
- [Redis Cloud API Reference](https://api.redislabs.com/v1/swagger-ui/index.html#/)
- [Composio Documentation](https://docs.composio.dev/docs/welcome)
- [Redis AI Resources](https://github.com/redis-developer/redis-ai-resources)
