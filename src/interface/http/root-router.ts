import { Router } from 'express';

import { githubWebhookController } from './conrtollers/analyze-pr.controller';
import { repoSyncController } from './conrtollers/repo-sync.controller';
import { healthController } from './conrtollers/health.controller';

export function createRootRouter(): Router {
  const router = Router();

  router.get('/health', healthController);
  router.post('/webhook/github/pr', githubWebhookController);
  router.post('/indexing/sync', repoSyncController);

  return router;
}
