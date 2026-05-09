import axios from 'axios';
import { envConfig } from '@config/env-config';

export const ollamaClient = axios.create({
  baseURL: `${envConfig.OLLAMA_URL}/api`,
});

export const getEmbedding = async (
  text: string,
  task: 'document' | 'query' = 'document',
): Promise<number[]> => {
  const prefix = task === 'document' ? 'search_document: ' : 'search_query: ';

  const { data } = await ollamaClient.post('/embeddings', {
    model: 'nomic-embed-text',
    prompt: `${prefix}${text}`,
  });

  return data.embedding;
};
