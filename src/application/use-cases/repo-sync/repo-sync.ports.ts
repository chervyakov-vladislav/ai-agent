import { ProcessedChunk, Embedding } from '@contracts/code-analysis.types';

export interface RepoSourcePort {
  getRepositoryInfo(repoUrl: string): Promise<{ defaultBranch: string }>;
  getRepositoryTree(repoId: string, branch: string): Promise<{ path: string; sha: string }[]>;
  getFileContent(repoUrl: string, path: string): Promise<{ content: string; extension: string }>;
}

export interface VectorStorePort {
  getStoredFilesMap(collection: string): Promise<Map<string, string>>;
  updateSyncIdForFile(collection: string, path: string, syncId: string): Promise<void>;
  indexChunks(collection: string, chunks: Embedding[], syncId: string): Promise<void>;
  cleanupOldSyncData(collection: string, syncId: string): Promise<void>;
}

export interface EmbeddingGeneratePort {
  generateEmbeddings(chunks: ProcessedChunk[]): Promise<Embedding[]>;
}

export interface SyncStatusPort {
  isBusy(): Promise<boolean>;
  setBusy(status: boolean): Promise<void>;
}
