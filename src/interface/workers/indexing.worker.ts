import { Worker, Job } from 'bullmq';
import { queueRedis } from '@shared/infrastructure/clients/redis-client';
import { queueLockAdapter } from '@modules/queues/queues.adapter';
import { QUEUE_NAMES } from '@modules/queues/queues.constants';
import { IndexingPayload } from '@application/contracts/queues.types';
import { logger } from '@shared/infrastructure/logger/pino-logger';
// Импортируем вашу бизнес-логику (Use Case)
// import { startIndexingUseCase } from '@application/use-cases/start-indexing.use-case';

export const initIndexingWorker = (): Worker => {
  const worker = new Worker(
    QUEUE_NAMES.INDEXING,
    async (job: Job<IndexingPayload>) => {
      const { repoId } = job.data;
      const jobId = job.id;

      if (!jobId) {
        throw new Error();
      }

      logger.info(`[Worker] Starting indexing job ${jobId} for repo ${repoId}`);

      const hasLock = await queueLockAdapter.acquireRepoLock(repoId, jobId);

      if (!hasLock) {
        throw new Error(`[Lock] Repository ${repoId} is currently locked. Rescheduling.`);
      }

      try {
        // await startIndexingUseCase(job.data);
      } finally {
        await queueLockAdapter.releaseRepoLock(repoId, jobId);
        logger.info(`[Worker] Released lock for repo ${repoId} after job ${jobId}`);
      }
    },
    { connection: queueRedis },
  );

  worker.on('failed', (job, error) => {
    if (error.message.includes('[Lock]')) {
      logger.debug(`[Worker] Job ${job?.id} is waiting for lock to release.`);
    } else {
      logger.error(`[Worker] Job ${job?.id} failed with critical error:`, error);
    }
  });

  return worker;
};
