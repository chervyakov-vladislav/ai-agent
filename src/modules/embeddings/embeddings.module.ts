import * as embeddingsService from './embeddings.service';

export const embeddingsModule = {
  generateEmbeddings: embeddingsService.generateChunksEmbeddings,
};

export type ProcessingModule = typeof embeddingsModule;
