import { Router } from 'express';
import { healthRouter } from '@/interface/http/routers/health.router';
import { webhookRouter } from '@/interface/http/routers/webhook.router';
import { repoSyncRouter } from '@/interface/http/routers/repo-sync.router';

export function createRootRouter(): Router {
  const router = Router();

  router.use(healthRouter);
  router.use(webhookRouter);
  router.use(repoSyncRouter);

  return router;
}
