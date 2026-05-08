import { Redis, RedisOptions } from 'ioredis';
import { envConfig } from '@/config/env-config';
import { logger } from '../logger';

const baseConfig: RedisOptions = {
  host: envConfig.REDIS_HOST,
  port: envConfig.REDIS_PORT,
  password: envConfig.REDIS_PASSWORD,
};
export const cacheRedis = new Redis({
  ...baseConfig,
  db: 0,
  keyPrefix: 'cache:',
});

export const queueRedis = new Redis({
  ...baseConfig,
  db: 1,
  maxRetriesPerRequest: null,
});

cacheRedis.on('error', (err) => logger.error('[Redis-Cache] Error:', err));
queueRedis.on('error', (err) => logger.error('[Redis-Queue] Error:', err));

export const checkRedisHealth = async (): Promise<boolean> => {
  try {
    const [cacheStatus, queueStatus] = await Promise.all([cacheRedis.ping(), queueRedis.ping()]);

    return cacheStatus === 'PONG' && queueStatus === 'PONG';
  } catch {
    return false;
  }
};
