import pLimit from 'p-limit';
import { RepositoryMetadata } from '@modules/webhooks/github/github.types';
import { logger } from '@shared/infrastructure/logger';
import { withRetry } from '@/shared/infrastructure/clients/http-client.utils';
import { InternalServerError } from '@/shared/errors/500.InternalServerError';
import { AppError } from '@shared/errors/AppError';
import { ProcessedChunk } from '@modules/processing/processing.types';

interface SyncDependencies {
  github: {
    getRepositoryInfo: (repoId: string) => Promise<RepositoryMetadata>;
    getRepositoryTree: (
      repoId: string,
      branch: string,
    ) => Promise<{ path: string; sha: string; extension: string }[]>;
    getFileContent: (
      repoUrl: string,
      path: string,
    ) => Promise<{ content: string; extension: string }>;
  };
  processing: {
    processFile: (
      filename: string,
      content: string,
      fileHash: string,
      extension: string,
    ) => Promise<ProcessedChunk[]>;
  };
  // vectorStore: {
  //   indexDocuments: (documents: any[], embedder: (text: string) => Promise<number[]>) => Promise<void>;
  // };
  parallelLimit: number;
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
  processing,
  // vectorStore,
  parallelLimit,
}: SyncDependencies) => {
  return async (repoId: string): Promise<void> => {
    const repoUrl = `/repos/${repoId}`;
    const metadata = await github.getRepositoryInfo(repoUrl);
    const filePaths = await github.getRepositoryTree(repoId, metadata.defaultBranch);
    const total = filePaths.length;
    let processed = 0;
    // рассмотреть возможность перехода с p-limit на работу с очередью через BullMq + redis
    const limit = pLimit(parallelLimit);

    const tasks = filePaths.map((file) =>
      limit(async () => {
        try {
          const { content, extension } = await withRetry(
            () => github.getFileContent(repoUrl, file.path),
            3,
            2000,
          );

          const chunks = await processing.processFile(file.path, content, file.sha, extension);

          // await vectorStore.indexChunks(chunks);

          console.log(chunks);

          processed++;

          logProgress(processed, total, file.path);
        } catch (error) {
          processed++;

          const syncError =
            error instanceof AppError
              ? error
              : new InternalServerError(`Failed to process ${file.path}`, 'REPO_SYNC_ERROR');

          logProgress(processed, total, file.path, syncError.message);
        }
      }),
    );

    await Promise.all(tasks);
    logger.info(`Sync completed. ${processed} files handled.`);
  };
};
