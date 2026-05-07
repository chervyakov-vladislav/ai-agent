import { Router } from 'express';
import { githubController } from './github/github.controller';

const webhookRouter = Router();

webhookRouter.post('/webhook/github/pr', githubController);

export { webhookRouter };
