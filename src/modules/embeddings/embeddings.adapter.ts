import * as embeddingsService from './embeddings.service';

export const embeddingsAdapter = {
  generateEmbeddings: embeddingsService.generateChunksEmbeddings,
};

export type EmbeddingAdapter = typeof embeddingsAdapter;
