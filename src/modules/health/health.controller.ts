import { Router } from 'express';
import { envConfig } from '@/config/env-config';
import { HealthResponseDTO, QdrantStatusDTO, AppStatusDTO } from './health.types';
import { checkQdrantHealth } from '@/modules/vectorstore/qdrant.service';

const createHealthRouter = (): Router => {
  const router = Router();

  router.get('/health', async (_req, res) => {
    // если потребуется тащить больше сервисов из других модулей, то вынести общую логику в use-case
    const isQdrantHealthy = await checkQdrantHealth();

    const qdrantStatus: QdrantStatusDTO = {
      is_healthy: isQdrantHealthy,
      status_text: isQdrantHealthy ? 'healthy' : 'unhealthy',
      service_name: 'Qdrant Vector DB',
    };

    const appStatus: AppStatusDTO = {
      status: isQdrantHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      node_version: process.version,
      app_version: envConfig.APP_VERSION,
    };

    const response: HealthResponseDTO = {
      ...appStatus,
      services: {
        qdrant: qdrantStatus,
      },
    };

    res.status(isQdrantHealthy ? 200 : 503).json(response);
  });

  return router;
};

export const healthRouter = createHealthRouter();
