import { EmbeddingCachePort } from '@application/use-cases/analyze-pr/analyze-pr.ports';
import * as service from './cache.service';

export const cacheAdapter: EmbeddingCachePort = {
  get: async (text: string) => {
    return await service.getEmbeddingFromCache(text);
  },
  save: async (text: string, vector: number[]) => {
    await service.saveEmbeddingToCache(text, vector);
  },
};
