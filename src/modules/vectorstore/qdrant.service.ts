import { createHash } from 'node:crypto';
import { v5 as uuidv5 } from 'uuid';
import { qdrantClient } from '@shared/infrastructure/clients/qdrant-client';
import { logger } from '@shared/infrastructure/logger/pino-logger';
import { Embedding } from '@modules/embeddings/embeddings.types';
import { envConfig } from '@config/env-config';
import { ScrollOffset } from './qdrant.types';
import { isFilesMapPayload } from './qdrant.utils';

const initializedCollections = new Map<string, Promise<void>>();

const ensureCollection = async (collectionName: string) => {
  if (initializedCollections.has(collectionName)) {
    return initializedCollections.get(collectionName);
  }

  const initVectorBase = async () => {
    try {
      const { collections } = await qdrantClient.getCollections();
      const exists = collections.some((c) => c.name === collectionName);

      if (!exists) {
        logger.info(`Creating collection: ${collectionName}`);
        await qdrantClient.createCollection(collectionName, {
          vectors: {
            size: 768,
            distance: 'Cosine',
          },
        });

        await qdrantClient.createPayloadIndex(collectionName, {
          field_name: 'filename',
          field_schema: 'keyword',
          wait: true,
        });

        logger.info(`Collection ${collectionName} created successfully.`);
      }
    } catch (error) {
      initializedCollections.delete(collectionName);
      logger.error(`Failed to ensure collection ${collectionName}`, error);
      throw error;
    }
  };

  const vectorbase = initVectorBase();

  initializedCollections.set(collectionName, vectorbase);
  return vectorbase;
};

export const getStoredFilesMap = async (collectionName: string): Promise<Map<string, string>> => {
  const filesMap = new Map<string, string>();
  let offset: ScrollOffset = undefined;

  try {
    await ensureCollection(collectionName);
    while (offset !== null) {
      const response = await qdrantClient.scroll(collectionName, {
        with_payload: ['filename', 'fileHash'],
        limit: 1000,
        offset: offset,
      });

      for (const point of response.points) {
        const payload = point.payload;

        if (isFilesMapPayload(payload)) {
          filesMap.set(payload.filename, payload.fileHash);
        }
      }

      offset = response.next_page_offset;

      if (!offset) break;
    }

    return filesMap;
  } catch (error) {
    logger.error('Error fetching stored files map from Qdrant', error);
    throw error;
  }
};

export const updateSyncIdForFile = async (
  collectionName: string,
  filename: string,
  syncId: string,
): Promise<void> => {
  try {
    await qdrantClient.setPayload(collectionName, {
      payload: { sync_id: syncId },
      filter: {
        must: [{ key: 'filename', match: { value: filename } }],
      },
      wait: true,
    });
  } catch (error) {
    logger.error(`Failed to update syncId for file: ${filename}`, error);
    throw error;
  }
};

export const cleanupOldSyncData = async (
  collectionName: string,
  currentSyncId: string,
): Promise<void> => {
  try {
    await qdrantClient.delete(collectionName, {
      filter: {
        must_not: [{ key: 'sync_id', match: { value: currentSyncId } }],
      },
    });
    logger.info(`Cleanup completed. Obsolete data removed.`);
  } catch (error) {
    logger.error('Failed to cleanup old sync data', error);
    throw error;
  }
};

export const deleteFileChunks = async (collectionName: string, filename: string): Promise<void> => {
  try {
    await qdrantClient.delete(collectionName, {
      filter: {
        must: [{ key: 'filename', match: { value: filename } }],
      },
    });
  } catch (error) {
    logger.error(`Failed to delete chunks for file: ${filename}`, error);
    throw error;
  }
};

export const indexChunks = async (
  collectionName: string,
  chunks: Embedding[],
  syncId: string,
): Promise<void> => {
  try {
    const points = chunks.map((chunk) => {
      const contentHash = createHash('sha256').update(chunk.content).digest('hex');

      return {
        id: uuidv5(`${chunk.metadata.filename}_${contentHash}`, envConfig.QDRANT_SEED_ID),
        vector: chunk.embedding,
        payload: {
          ...chunk.metadata,
          content: chunk.content,
          sync_id: syncId,
        },
      };
    });

    await qdrantClient.upsert(collectionName, {
      wait: true,
      points,
    });

    logger.info(`Indexed ${chunks.length} chunks for ${chunks[0]?.metadata.filename}`);
  } catch (error: unknown) {
    logger.error('Failed to index chunks in Qdrant', error, {
      collectionName,
      filename: chunks[0]?.metadata.filename,
    });
  }
};
