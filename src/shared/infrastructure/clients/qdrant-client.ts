import { QdrantClient } from '@qdrant/js-client-rest';
import { envConfig } from '@config/env-config';
import { logger } from '../logger';

export const qdrantClient = new QdrantClient({
  url: envConfig.QDRANT_URL,
  apiKey: envConfig.QDRANT_API_KEY,
  checkCompatibility: true,
});

export const checkQdrantHealth = async (timeoutMs = 3000): Promise<boolean> => {
  try {
    const healthPromise = qdrantClient.api().readyz({});

    await Promise.race([
      healthPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs)),
    ]);

    return true;
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'Timeout') {
        logger.error(`[Qdrant] Health check failed: Timeout after ${timeoutMs}ms`, error);
      } else {
        logger.error(`[Qdrant] Health check error: ${error.message}`, error);
      }
    } else {
      logger.error('[Qdrant] Unknown connection error', error);
    }

    return false;
  }
};
