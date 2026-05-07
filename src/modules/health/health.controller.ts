import { Router } from 'express';
import { envConfig } from '@/config/env-config';
import { HealthResponseDTO, QdrantStatusDTO, AppStatusDTO, RedisStatusDTO } from './health.types';
import { checkRedisHealth } from '@/shared/infrastructure/clients/bullmq-client';
import { checkQdrantHealth } from '@shared/infrastructure/clients/qdrant-client';

const createHealthRouter = (): Router => {
  const router = Router();

  router.get('/health', async (_req, res) => {
    const [isQdrantHealthy, isRedisHealthy] = await Promise.all([
      checkQdrantHealth(),
      checkRedisHealth(),
    ]);

    const qdrantStatus: QdrantStatusDTO = {
      is_healthy: isQdrantHealthy,
      status_text: isQdrantHealthy ? 'healthy' : 'unhealthy',
      service_name: 'Qdrant Vector DB',
    };

    const redisStatus: RedisStatusDTO = {
      is_healthy: isRedisHealthy,
      status_text: isRedisHealthy ? 'healthy' : 'unhealthy',
      service_name: 'Redis (BullMQ)',
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
        redis: redisStatus,
      },
    };

    res.status(isQdrantHealthy ? 200 : 503).json(response);
  });

  return router;
};

export const healthRouter = createHealthRouter();
