import { Worker, Job } from 'bullmq';
import { queueRedis } from '@shared/infrastructure/clients/redis-client';
import { queueLockAdapter } from '@modules/queues/queues.adapter';
import { QUEUE_NAMES } from '@modules/queues//queues.constants';
import { AnalysisPayload } from '@application/contracts/queues.types';
// import { logger } from '@shared/infrastructure/logger/pino-logger';
// import { analyzePullRequestUseCase } from '@application/use-cases/analyze-pr.use-case';

export const initAnalysisWorker = (): Worker => {
  return new Worker(
    QUEUE_NAMES.ANALYSIS,
    async (job: Job<AnalysisPayload>) => {
      const { repoId } = job.data;
      const jobId = job.id;

      if (!jobId) {
        throw new Error();
      }

      const hasLock = await queueLockAdapter.acquireRepoLock(repoId, jobId);

      if (!hasLock) {
        throw new Error(`[Lock] Repository ${repoId} is busy. Delaying PR analysis.`);
      }

      try {
        // await analyzePullRequestUseCase(job.data);
      } finally {
        await queueLockAdapter.releaseRepoLock(repoId, jobId);
      }
    },
    { connection: queueRedis },
  );
};
