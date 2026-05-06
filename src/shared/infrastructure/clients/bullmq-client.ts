import { Queue, ConnectionOptions } from 'bullmq';
// import { envConfig } from '@/config/env-config';

// доработать позже
export const redisConnection: ConnectionOptions = {
  // host: envConfig.REDIS_HOST || 'localhost',
  // port: envConfig.REDIS_PORT || 6379,
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
