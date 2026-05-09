import pLimit from 'p-limit';
import { getEmbedding } from '@shared/infrastructure/clients/ollama-client';
import { ProcessedChunk } from '@modules/processing/processing.types';
import { envConfig } from '@config/env-config';

const limit = pLimit(envConfig.OLLAMA_NUM_PARALLEL);

export const generateChunksEmbeddings = async (chunks: ProcessedChunk[]) => {
  return Promise.all(
    chunks.map((chunk) =>
      limit(async () => {
        const embedding = await getEmbedding(chunk.content, 'document');

        return {
          ...chunk,
          embedding,
        };
      }),
    ),
  );
};
