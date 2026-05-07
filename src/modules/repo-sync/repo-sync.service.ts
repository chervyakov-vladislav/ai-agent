import { syncFullRepositoryUseCase } from 'container/dependency-injection/repo-sync.container';
import { logger } from '@/shared/infrastructure/logger/pino-logger';
import { parseRepoFullName } from '../webhooks/github/github.utils';

// создать очередь на чистом js. либо добавить очередь через bullMQ + redis
let isSyncInProgress = false;

export const isBusy = () => isSyncInProgress;

export const startRepoSync = (repoUrl: string): void => {
  logger.info('Starting repository sync', { repoUrl });
  const repoId = parseRepoFullName(repoUrl);

  isSyncInProgress = true;
  syncFullRepositoryUseCase(repoId)
    .then(() => {
      logger.info('Repository sync completed successfully', { repoId });
    })
    .catch((error) => {
      logger.error('Repository sync failed', {
        repoId,
        err: error instanceof Error ? error.message : error,
      });
    })
    .finally(() => {
      isSyncInProgress = false;
    });
};

export const isSystemBusy = () => isSyncInProgress;
