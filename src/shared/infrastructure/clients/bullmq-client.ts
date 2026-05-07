import { Queue, ConnectionOptions } from 'bullmq';
import { envConfig } from '@/config/env-config';
import { logger } from '../logger';

export const redisConnection: ConnectionOptions = {
  host: envConfig.REDIS_HOST,
  port: envConfig.REDIS_PORT,
};

export const repoSyncQueue = new Queue('repo-sync-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 30000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  },
});

repoSyncQueue.on('error', (err) => {
  logger.error('[BullMQ] Queue Error:', err);
});

repoSyncQueue.on('waiting', (jobId) => {
  logger.debug(`[BullMQ] Job ${jobId} is now waiting`);
});

export const checkRedisHealth = async (): Promise<boolean> => {
  try {
    const client = await repoSyncQueue.client;
    const result = await client.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
};
