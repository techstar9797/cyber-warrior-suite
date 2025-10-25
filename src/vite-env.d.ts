/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LANGCACHE_API_KEY: string
  readonly VITE_REDIS_API_KEY: string
  readonly VITE_COMPOSIO_API_KEY: string
  readonly VITE_LANGCACHE_BASE_URL: string
  readonly VITE_REDIS_BASE_URL: string
  readonly VITE_COMPOSIO_BASE_URL: string
  readonly VITE_REDIS_HOST: string
  readonly VITE_REDIS_PORT: string
  readonly VITE_REDIS_PASSWORD: string
  readonly VITE_REDIS_DATABASE: string
  readonly VITE_SLACK_WORKSPACE_URL: string
  readonly VITE_SLACK_BOT_TOKEN: string
  readonly VITE_USE_REAL_APIS: string
  readonly VITE_ENABLE_REDIS_CLOUD: string
  readonly VITE_ENABLE_LANG_CACHE: string
  readonly VITE_ENABLE_COMPOSIO: string
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}