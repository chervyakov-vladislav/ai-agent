import { Router } from 'express';
import { healthRouter } from 'modules/health/health.controller';
import { webhookRouter } from '@/modules/webhooks/webhook.router';
import { repoSyncRouter } from '@/modules/repo-sync/repo-sync.router';

export function createRootRouter(): Router {
  const router = Router();

  router.use(healthRouter);
  router.use(webhookRouter);
  router.use(repoSyncRouter);

  return router;
}
