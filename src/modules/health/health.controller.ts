import { Router } from 'express';
import { envConfig } from '@/config/env-config';

const createHealthRouter = (): Router => {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      node_version: process.version,
      app_version: envConfig.APP_VERSION,
    });
  });

  return router;
};

export const healthRouter = createHealthRouter();
