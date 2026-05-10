import pLimit from 'p-limit';
import { ProcessedChunk } from '@application/contracts/code-analysis.types';
import { getEmbedding } from '@shared/infrastructure/clients/ollama-client';
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
