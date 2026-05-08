import { Router } from 'express';
import { githubController } from '@modules/webhooks/github/github.controller';

const webhookRouter = Router();

webhookRouter.post('/webhook/github/pr', githubController);

export { webhookRouter };
