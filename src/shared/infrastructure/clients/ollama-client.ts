import axios from 'axios';
import { envConfig } from '@config/env-config';
import { InternalServerError } from '../../errors/500.InternalServerError';
import { logger } from '../logger';

export const ollamaClient = axios.create({
  baseURL: `${envConfig.OLLAMA_URL}/api`,
});

export const getEmbedding = async (
  text: string,
  task: 'document' | 'query' = 'document',
): Promise<number[]> => {
  const prefix = task === 'document' ? 'search_document: ' : 'search_query: ';

  try {
    const { data } = await ollamaClient.post('/embeddings', {
      model: 'nomic-embed-text',
      prompt: `${prefix}${text}`,
    });

    return data.embedding;
  } catch {
    logger.error(
      `Prompt length: ${text.length}`,
      {},
      {
        length: text.length,
        sample: text.substring(0, 300),
      },
    );
    throw new InternalServerError('Failed to get embeddings from Ollama', 'OLLAMA_SERVICE_ERROR');
  }
};
