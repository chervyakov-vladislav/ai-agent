import type { Request, Response } from 'express';
import { envConfig } from '@/config/env-config';
import { checkRedisHealth } from '@/shared/infrastructure/clients/redis-client';
import { checkQdrantHealth } from '@shared/infrastructure/clients/qdrant-client';

export const healthController = async (_req: Request, res: Response) => {
  const [isQdrantHealthy, isRedisHealthy] = await Promise.all([
    checkQdrantHealth(),
    checkRedisHealth(),
  ]);

  const qdrantStatus = {
    is_healthy: isQdrantHealthy,
    status_text: isQdrantHealthy ? 'healthy' : 'unhealthy',
    service_name: 'Qdrant Vector DB',
  };

  const redisStatus = {
    is_healthy: isRedisHealthy,
    status_text: isRedisHealthy ? 'healthy' : 'unhealthy',
    service_name: 'Redis (BullMQ)',
  };

  const appStatus = {
    status: isQdrantHealthy ? 'ok' : 'error',
    timestamp: new Date().toISOString(),
    node_version: process.version,
    app_version: envConfig.APP_VERSION,
  };

  const response = {
    ...appStatus,
    services: {
      qdrant: qdrantStatus,
      redis: redisStatus,
    },
  };

  res.status(isQdrantHealthy ? 200 : 503).json(response);
};
