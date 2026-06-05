import { Worker, Job } from 'bullmq';
import { queueRedis } from '@shared/infrastructure/clients/redis-client';
import { queueLockAdapter } from '@modules/queues/queues.adapter';
import { QUEUE_NAMES } from '@modules/queues/queues.constants';
import { AnalysisPayload } from '@application/contracts/queues.types';
import { logger } from '@shared/infrastructure/logger/pino-logger';
import { LockConflictError } from '@shared/errors/423.LockConflictError';
import { WorkerError } from '@shared/errors/500.WorkerError';

export const initAnalysisWorker = (): Worker => {
  const worker = new Worker(
    QUEUE_NAMES.ANALYSIS,
    async (job: Job<AnalysisPayload>) => {
      const { repoId } = job.data;
      const jobId = job.id;

      if (!jobId) {
        throw new WorkerError('[Worker] Job ID is missing');
      }

      const hasLock = await queueLockAdapter.acquireRepoLock(repoId, jobId);

      if (!hasLock) {
        throw new LockConflictError(`Repository ${repoId} is busy. Delaying PR analysis.`);
      }

      try {
        logger.info(`[Worker] Starting analysis for PR ${job.data.prId} in repo ${repoId}`);
        // await analyzePullRequestUseCase(job.data);
      } finally {
        await queueLockAdapter.releaseRepoLock(repoId, jobId);
        logger.info(`[Worker] Released lock for repo ${repoId} after analysis job ${jobId}`);
      }
    },
    { connection: queueRedis, concurrency: 2 },
  );

  worker.on('failed', (job, error) => {
    if (error instanceof LockConflictError) {
      logger.debug(`[Worker] Analysis job ${job?.id} is waiting for lock: ${error.message}`);
    } else {
      logger.error(`[Worker] Analysis job ${job?.id} failed with error:`, error);
    }
  });

  return worker;
};
