import { Router } from 'express';
import { healthRouter } from 'modules/health/health.controller';
import { webhookRouter } from '@/modules/webhooks/webhook.router';

export function createRootRouter(): Router {
  const router = Router();

  router.use(healthRouter);
  router.use(webhookRouter);

  return router;
}
