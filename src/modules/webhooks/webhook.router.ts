import { Router } from 'express';
import { githubController } from './github/github.controller';

const createWebhookRouter = (): Router => {
  const webhookRouter = Router();

  webhookRouter.post('/webhook/github/pr', githubController);

  return webhookRouter;
};

export const webhookRouter = createWebhookRouter();
