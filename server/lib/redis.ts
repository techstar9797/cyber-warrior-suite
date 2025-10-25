import { createClient, RedisClientType } from 'redis';

let client: RedisClientType | null = null;

export async function getRedis(): Promise<RedisClientType> {
  if (client && client.isOpen) {
    return client;
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  client = createClient({ url: redisUrl });

  client.on('error', (err) => console.error('Redis Client Error:', err));
  client.on('connect', () => console.log('✅ Connected to Redis'));

  await client.connect();
  return client;
}

export async function closeRedis(): Promise<void> {
  if (client && client.isOpen) {
    await client.quit();
    client = null;
  }
}
