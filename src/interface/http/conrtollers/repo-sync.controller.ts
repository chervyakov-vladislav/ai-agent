import { Request, Response, NextFunction } from 'express';
import { SyncRepoSchema } from '../dto-validators/repo-sync.schema';
import { syncFullRepositoryUseCase } from '@application/use-cases/repo-sync/repo-sync.module';
import { logger } from '@shared/infrastructure/logger';

export const repoSyncController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = SyncRepoSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ errors: result.error.issues });
    }

    syncFullRepositoryUseCase({
      repoId: result.data.repoId,
      collectionName: result.data.repoId.replace(/\//g, '_'),
      repoUrl: `/repos/${result.data.repoId}`,
    })
      .then(() => {
        logger.info('Repository sync completed successfully', { repoId: result.data.repoId });
      })
      .catch((error) => {
        logger.error('Repository sync failed', error, {
          repoId: result.data.repoId,
        });
      });

    return res.status(202).json({
      status: 'accepted',
      message: 'Repository sync started in background',
    });
  } catch (err) {
    next(err);
  }
};
