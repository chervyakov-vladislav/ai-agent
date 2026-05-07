import { Request, Response } from 'express';
import { BadRequestError } from 'shared/errors/400.BadRequestError';
import * as repoSyncService from './repo-sync.service';
import { ServiceUnavailableError } from 'shared/errors/503.ServiceUnavailableError';
import { syncSchema } from './repo-sync.validator';

export const repoSyncController = (req: Request, res: Response) => {
  const { repoUrl } = syncSchema.parse(req.body);

  if (!repoUrl) {
    throw new BadRequestError('repoUrl is required');
  }

  if (repoSyncService.isBusy()) {
    // отправить коммент в пул реквест, что сервис не смог обновиться по причине того что занят

    throw new ServiceUnavailableError(
      'Another repository is being indexed. Please wait a few minutes.',
    );
  }

  repoSyncService.startRepoSync(repoUrl);

  return res.status(202).json({
    status: 'accepted',
    message: 'Repository sync started in background',
  });
};
