import { Router } from 'express';
import { healthController } from '@/modules/health/health.controller';

const healthRouter = Router();

healthRouter.get('/health', healthController);

export { healthRouter };
