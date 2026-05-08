import { Queue } from 'bullmq';
import { logger } from '../logger';
import { queueRedis } from './redis-client';

export const repoSyncQueue = new Queue('repo-sync-queue', {
  connection: queueRedis,
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
