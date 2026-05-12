import * as embeddingsService from './embeddings.service';

export const embeddingsDocumentAdapter = {
  generateEmbeddings: embeddingsService.generateChunksEmbeddings,
};

export const embeddingsQueryAdapter = {
  generateQueryEmbedding: embeddingsService.generateQueryEmbedding,
};
