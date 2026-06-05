import { Worker, Job } from 'bullmq';
import { queueRedis } from '@shared/infrastructure/clients/redis-client';
import { queueLockAdapter } from '@modules/queues/queues.adapter';
import { QUEUE_NAMES } from '@modules/queues/queues.constants';
import { IndexingPayload } from '@application/contracts/queues.types';
import { logger } from '@shared/infrastructure/logger/pino-logger';
import { LockConflictError } from '@shared/errors/423.LockConflictError';
import { WorkerError } from '@shared/errors/500.WorkerError';

export const initIndexingWorker = (): Worker => {
  const worker = new Worker(
    QUEUE_NAMES.INDEXING,
    async (job: Job<IndexingPayload>) => {
      const { repoId } = job.data;
      const jobId = job.id;

      if (!jobId) {
        throw new WorkerError('[Worker] Job ID is missing');
      }

      logger.info(`[Worker] Starting indexing job ${jobId} for repo ${repoId}`);

      const hasLock = await queueLockAdapter.acquireRepoLock(repoId, jobId);

      if (!hasLock) {
        throw new LockConflictError(`Repository ${repoId} is currently locked. Rescheduling.`);
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
    if (error instanceof LockConflictError) {
      logger.debug(`[Worker] Indexing job ${job?.id} is waiting for lock: ${error.message}`);
    } else {
      logger.error(`[Worker] Indexing job ${job?.id} failed with critical error:`, error);
    }
  });

  return worker;
};
