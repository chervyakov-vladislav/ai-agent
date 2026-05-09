import * as qdrantService from './qdrant.service';

export const qdrantModule = {
  getStoredFilesMap: qdrantService.getStoredFilesMap,
  updateSyncIdForFile: qdrantService.updateSyncIdForFile,
  indexChunks: qdrantService.indexChunks,
  cleanupOldSyncData: qdrantService.cleanupOldSyncData,
  deleteFileChunks: qdrantService.deleteFileChunks,
};

export type QdrantModule = typeof qdrantModule;
