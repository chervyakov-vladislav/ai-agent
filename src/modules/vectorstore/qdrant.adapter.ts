import { VectorStorePort } from '@application/use-cases/repo-sync/repo-sync.ports';
import { Embedding } from '@application/contracts/code-analysis.types';
import * as qdrantService from './qdrant.service';

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
