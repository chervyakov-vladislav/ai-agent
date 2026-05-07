import { InternalServerError } from '../errors/500.InternalServerError';
import { checkRedisHealth } from './clients/bullmq-client';
import { checkQdrantHealth } from './clients/qdrant-client';
import { logger } from './logger';

export const initInfrastructure = async () => {
  logger.info('Initializing infrastructure...');

  const [redisOk, qdrantOk] = await Promise.all([checkRedisHealth(), checkQdrantHealth()]);

  if (!redisOk) {
    throw new InternalServerError('Redis (BullMQ) is unreachable', 'REDIS_CONNECTION_FAILED');
  }

  if (!qdrantOk) {
    throw new InternalServerError('Qdrant Vector Store is unreachable', 'QDRANT_CONNECTION_FAILED');
  }

  logger.info('Infrastructure connections established successfully');
};
