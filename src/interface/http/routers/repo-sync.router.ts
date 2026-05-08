import { Router } from 'express';
import { repoSyncController } from '@/modules/repo-sync/repo-sync.controller';

const repoSyncRouter = Router();

repoSyncRouter.post('/indexing/sync', repoSyncController);

export { repoSyncRouter };
