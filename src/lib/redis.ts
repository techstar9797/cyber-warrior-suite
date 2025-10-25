import { createClient, RedisClientType } from 'redis';

// Singleton Redis client
let redisClient: RedisClientType | null = null;

export async function getRedisClient(): Promise<RedisClientType> {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Connected to Redis');
    });

    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  }

  return redisClient;
}

export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

// Helper functions for common Redis operations
export const redis = {
  // JSON operations
  json: {
    set: async (key: string, path: string, value: unknown): Promise<string> => {
      const client = getRedisClient();
      return await client.call('JSON.SET', key, path, JSON.stringify(value));
    },

    get: async (key: string, path?: string): Promise<unknown> => {
      const client = getRedisClient();
      const result = await client.call('JSON.GET', key, path || '.');
      return result ? JSON.parse(result as string) : null;
    },

    delete: async (key: string, path?: string): Promise<number> => {
      const client = getRedisClient();
      return await client.call('JSON.DEL', key, path || '.');
    },
  },

  // Search operations
  search: {
    createIndex: async (index: string, schema: string[]): Promise<string> => {
      const client = getRedisClient();
      return await client.call('FT.CREATE', index, 'ON', 'JSON', 'PREFIX', '1', 'sec:', 'SCHEMA', ...schema);
    },

    search: async (index: string, query: string, options?: { limit?: { offset?: number; count?: number }; sortBy?: { field: string; order?: string } }): Promise<unknown> => {
      const client = getRedisClient();
      const args: string[] = ['FT.SEARCH', index, query];

      if (options?.limit) args.push('LIMIT', (options.limit.offset || 0).toString(), (options.limit.count || 10).toString());
      if (options?.sortBy) args.push('SORTBY', options.sortBy.field, options.sortBy.order || 'ASC');

      return await client.call(...args);
    },

    dropIndex: async (index: string, deleteDocs?: boolean): Promise<string> => {
      const client = getRedisClient();
      return await client.call('FT.DROPINDEX', index, deleteDocs ? 'DD' : '');
    },
  },

  // Key operations
  keys: {
    exists: async (key: string): Promise<number> => {
      const client = getRedisClient();
      return await client.exists(key);
    },

    delete: async (key: string): Promise<number> => {
      const client = getRedisClient();
      return await client.del(key);
    },
  },
};
