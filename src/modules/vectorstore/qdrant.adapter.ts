import { VectorStorePort } from '@application/use-cases/repo-sync/repo-sync.ports';
import { Embedding } from '@contracts/code-analysis.types';
import * as qdrantService from './qdrant.service';
import { CodeSearchPort } from '../../application/use-cases/analyze-pr/analyze-pr.ports';

export const qdrantAdapter: VectorStorePort = {
  async getStoredFilesMap(collection) {
    return qdrantService.getStoredFilesMap(collection);
  },

  async updateSyncIdForFile(collection, path, syncId) {
    await qdrantService.updateSyncIdForFile(collection, path, syncId);
  },

  async indexChunks(collection, chunks: Embedding[], syncId) {
    await qdrantService.indexChunks(collection, chunks, syncId);
  },

  async cleanupOldSyncData(collection, syncId) {
    await qdrantService.cleanupOldSyncData(collection, syncId);
  },
};

export const qdrantVectorSearchAdapter: CodeSearchPort = {
  async findSimilarNodeIds(collectionName, queryEmbedding, limit = 5) {
    const result = await qdrantService.searchSmallChunks(collectionName, queryEmbedding, limit);

    return [...new Set(result.map((p) => p.payload.parent_id))];
  },

  async getReconstructedChunks(collectionName, parentIds) {
    return await qdrantService.getReconstructedChunks(collectionName, parentIds);
  },
};
