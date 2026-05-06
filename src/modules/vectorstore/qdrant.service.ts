import { qdrantClient, pingQdrantApi } from '@shared/infrastructure/clients/qdrant-client';
import { logger } from '@shared/infrastructure/logger/pino-logger';

const COLLECTION_NAME = 'code_base';
const HEALTH_CHECK_TIMEOUT_MS = 3000;

export const initQdrant = async () => {
  try {
    const { collections } = await qdrantClient.getCollections();
    const exists = collections.some((c) => c.name === COLLECTION_NAME);

    if (!exists) {
      logger.info(`Creating collection: ${COLLECTION_NAME}`);
      await qdrantClient.createCollection(COLLECTION_NAME, {
        vectors: {
          size: 768,
          distance: 'Cosine',
        },
      });
      logger.info(`Collection ${COLLECTION_NAME} created successfully.`);
    } else {
      logger.info(`Collection ${COLLECTION_NAME} already exists.`);
    }
  } catch (error) {
    logger.error('Failed to initialize Qdrant collection', error);
    throw error;
  }
};

export const checkQdrantHealth = async () => {
  try {
    const response = await pingQdrantApi(HEALTH_CHECK_TIMEOUT_MS);

    if (!response.ok) {
      logger.error(`Qdrant health check failed with status: ${response.status}`);
      return false;
    }

    return true;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.error(`Qdrant health check timed out after ${HEALTH_CHECK_TIMEOUT_MS}ms`);
    } else {
      logger.error('Qdrant health check failed', error);
    }
    return false;
  }
};
