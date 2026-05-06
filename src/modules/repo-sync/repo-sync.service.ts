import { syncFullRepositoryUseCase } from '@/shared/infrastructure/registry/repo-sync.registry';
import { logger } from '@/shared/infrastructure/logger/pino-logger';
import { parseRepoFullName } from '../webhooks/github/github.utils';

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
