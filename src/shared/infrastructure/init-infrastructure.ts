import { checkRedisHealth } from './clients/bullmq-client';
import { checkQdrantHealth } from './clients/qdrant-client';
import { logger } from './logger';

export const initInfrastructure = async () => {
  logger.info('Initializing infrastructure...');

  const [redisOk, qdrantOk] = await Promise.all([checkRedisHealth(), checkQdrantHealth()]);

  if (!redisOk) {
    throw new Error('Infrastructure initialization failed: Redis is unreachable');
  }

  if (!qdrantOk) {
    throw new Error('Infrastructure initialization failed: Qdrant is unreachable');
  }

  logger.info('Infrastructure connections established successfully');
};
