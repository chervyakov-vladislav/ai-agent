import { qdrantClient } from '@shared/infrastructure/clients/qdrant-client';
import { logger } from '@shared/infrastructure/logger/pino-logger';

const COLLECTION_NAME = 'code_base';

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
    await qdrantClient.getCollections();
    return true;
  } catch (error) {
    logger.error('Qdrant health check failed', error);
    return false;
  }
};
