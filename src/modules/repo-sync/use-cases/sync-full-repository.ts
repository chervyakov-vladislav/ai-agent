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

const logProgress = (
  current: number,
  total: number,
  file: string,
  error?: string,
  stack?: string,
) => {
  const percentage = ((current / total) * 100).toFixed(2);
  const status = error ? `Failed: ${error}` : `Indexed: ${file}`;
  const prefix = `[${current}/${total}] (${percentage}%)`;

  if (error) {
    logger.error('Failed to process file', { path: file, error, stack });
  } else {
    logger.info(`${prefix} ${status}`);
  }
};

const logMemory = (stage: string) => {
  const used = process.memoryUsage();
  logger.debug(`Memory Usage (${stage}):`, {
    rss: `${(used.rss / 1024 / 1024).toFixed(2)} MB`, // Общая память, выделенная процессу
    heapUsed: `${(used.heapUsed / 1024 / 1024).toFixed(2)} MB`, // Используемая память в куче
    heapTotal: `${(used.heapTotal / 1024 / 1024).toFixed(2)} MB`, // Общий размер кучи
    external: `${(used.external / 1024 / 1024).toFixed(2)} MB`, // C++ объекты (например, от ts-morph)
  });
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

          logMemory('Before processing');
          const chunks = await processing.processFile(file.path, content, file.sha, extension);
          logMemory('After processing');

          // await vectorStore.indexChunks(chunks);

          console.log(chunks);
          // chunks.forEach((chunk) => {
          //   console.log(chunk.metadata.symbolKind);
          //   console.log(chunk.metadata.symbolName);
          // });

          processed++;

          logProgress(processed, total, file.path);
        } catch (error) {
          processed++;

          const syncError =
            error instanceof AppError
              ? error
              : new InternalServerError(`Failed to process ${file.path}`, 'REPO_SYNC_ERROR');

          logProgress(processed, total, file.path, syncError.message, syncError.stack);
        }
      }),
    );

    await Promise.all(tasks);
    logger.info(`Sync completed. ${processed} files handled.`);
  };
};
