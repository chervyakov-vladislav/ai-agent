// import { VectorStoreService } from '../../vectorstore/qdrant.service';
// import { ProcessingService } from '../../processing/processing.service';

import pLimit from 'p-limit';
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

const logProgress = (current: number, total: number, file: string, error?: string) => {
  const percentage = ((current / total) * 100).toFixed(2);
  const status = error ? `Failed: ${error}` : `Indexed: ${file}`;
  const prefix = `[${current}/${total}] (${percentage}%)`;

  if (error) {
    logger.error(`${prefix} ${status}`);
  } else {
    logger.info(`${prefix} ${status}`);
  }
};

export const createSyncFullRepositoryUseCase = ({
  github,
  // processing,
  // vectorStore,
}: SyncDependencies) => {
  return async (repoId: string): Promise<void> => {
    const repoUrl = `/repos/${repoId}`;
    const metadata = await github.getRepositoryInfo(repoUrl);
    const filePaths = await github.getRepositoryTree(repoId, metadata.defaultBranch);
    const total = filePaths.length;
    let processed = 0;
    const limit = pLimit(5);

    const tasks = filePaths.map((file) =>
      limit(async () => {
        try {
          const content = await github.getFileContent(repoUrl, file.path);
          // const chunks = await processing.processFile(file, content);
          // await vectorStore.indexChunks(chunks);

          console.log(content);

          processed++;

          logProgress(processed, total, file.path);
        } catch (error) {
          processed++;

          if (error instanceof Error) {
            logProgress(processed, total, file.path, error.message);
          }
        }
      }),
    );

    await Promise.all(tasks);
    logger.info(`✅ Sync completed. ${processed} files handled.`);
  };
};
