// import { VectorStoreService } from '../../vectorstore/qdrant.service';
// import { ProcessingService } from '../../processing/processing.service';

import { RepositoryMetadata } from '@/modules/webhooks/github/github.types';
import { logger } from '@shared/infrastructure/logger';

interface SyncDependencies {
  github: {
    getRepositoryInfo: (repoId: string) => Promise<RepositoryMetadata>;
    getRepositoryTree: (repoId: string, branch: string) => Promise<{ path: string; sha: string }[]>;
    getFileContent: (repoUrl: string, path: string) => Promise<string>;
  };
  // processing: {
  //   splitTextIntoDocuments: (content: string, metadata: Record<string, any>) => Promise<any[]>;
  //   generateEmbedding: (text: string) => Promise<number[]>;
  // };
  // vectorStore: {
  //   indexDocuments: (documents: any[], embedder: (text: string) => Promise<number[]>) => Promise<void>;
  // };
}
export const createSyncFullRepositoryUseCase = ({
  github,
  // processing,
  // vectorStore,
}: SyncDependencies) => {
  return async (repoId: string): Promise<void> => {
    const metadata = await github.getRepositoryInfo(`/repos/${repoId}`);
    const filePaths = await github.getRepositoryTree(repoId, metadata.defaultBranch);

    logger.debug(JSON.stringify(filePaths));

    // Нарезаем на чанки LangChain
    // const documents = await processing.splitFilesIntoDocuments(files);

    // Эмбеддинги и сохранение
    // await vectorStore.indexDocuments(documents, (text) => processing.generateEmbedding(text));
  };
};
