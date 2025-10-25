# Environment Variables Setup

Create a `.env` file in the root directory with these variables:

```bash
# App Configuration
VITE_APP_URL=http://localhost:8080
PORT=8080

# Redis Configuration
REDIS_URL=redis://localhost:6379
VITE_REDIS_HOST=localhost
VITE_REDIS_PORT=6379
VITE_REDIS_PASSWORD=

# Composio Configuration (Phase 3)
COMPOSIO_API_KEY=
VITE_COMPOSIO_API_KEY=
COMPOSIO_SLACK_DEFAULT_CHANNEL=#ot-soc

# Feature Flags
VITE_USE_REAL_APIS=false
VITE_ENABLE_REDIS_CLOUD=false
VITE_ENABLE_LANG_CACHE=false
VITE_ENABLE_COMPOSIO=false

# Development
NODE_ENV=development
MODE=development
```

Note: `.env` files are gitignored for security. Copy this template and add your actual API keys.
