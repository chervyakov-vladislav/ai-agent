import { QdrantClient } from '@qdrant/js-client-rest';
import { envConfig } from '@config/env-config';
import { logger } from '../logger';

export const qdrantClient = new QdrantClient({
  url: envConfig.QDRANT_URL,
});

export const checkQdrantHealth = async (timeoutMs = 3000): Promise<boolean> => {
  try {
    const result = await Promise.race([
      qdrantClient.getCollections(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs)),
    ]);

    return !!result;
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'Timeout') {
        logger.error(`[Qdrant] Health check failed: Timeout after ${timeoutMs}ms`);
      } else {
        logger.error(`[Qdrant] Connection error: ${error.message}`, { error });
      }
    } else {
      logger.error('[Qdrant] Unknown connection error');
    }

    return false;
  }
};
