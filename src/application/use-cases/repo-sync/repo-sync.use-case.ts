import pLimit from 'p-limit';
import type { SplitResult } from '@/application/contracts/code-analysis.types';
import { logger } from '@shared/infrastructure/logger';
import { withRetry } from '@/shared/infrastructure/clients/http-client.utils';
import { InternalServerError } from '@/shared/errors/500.InternalServerError';
import { AppError } from '@shared/errors/AppError';
import {
  EmbeddingGeneratePort,
  RepoSourcePort,
  SyncStatusPort,
  VectorStorePort,
} from '@/application/use-cases/repo-sync/repo-sync.ports';
import { ServiceUnavailableError } from '@shared/errors/503.ServiceUnavailableError';

interface SyncDependencies {
  statusPort: SyncStatusPort;
  github: RepoSourcePort;
  embeddings: EmbeddingGeneratePort;
  vectorStore: VectorStorePort;
  processFilePipeline: (
    path: string,
    content: string,
    sha: string,
    extension: string,
  ) => Promise<SplitResult>;
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
    logger.error('Failed to process file', error, { path: file, error, stack });
  } else {
    logger.info(`${prefix} ${status}`);
  }
};

// вынести в пайаплайны и сделать embeddingsPipeline и indexingPipeline
export const createSyncFullRepositoryUseCase = ({
  statusPort,
  github,
  embeddings,
  vectorStore,
  parallelLimit,
  processFilePipeline,
}: SyncDependencies) => {
  return async (repoId: string, collectionName: string): Promise<void> => {
    // управлять этим через очередина BullMQ
    if (await statusPort.isBusy()) {
      throw new ServiceUnavailableError(
        'Another repository is being indexed. Please wait a few minutes.',
      );
    }

    await statusPort.setBusy(true);

    try {
      const currentSyncId = Date.now().toString();
      const repoUrl = `/repos/${repoId}`;
      const metadata = await github.getRepositoryInfo(repoUrl);
      const filePaths = await github.getRepositoryTree(repoId, metadata.defaultBranch);
      const storedFiles = await vectorStore.getStoredFilesMap(collectionName);
      const total = filePaths.length;
      let processed = 0;
      // рассмотреть возможность перехода с p-limit на работу с очередью через BullMq + redis
      const limit = pLimit(parallelLimit);

      const tasks = filePaths.map((file) =>
        limit(async () => {
          try {
            const existingHash = storedFiles.get(file.path);

            if (existingHash === file.sha) {
              await vectorStore.updateSyncIdForFile(collectionName, file.path, currentSyncId);
              processed++;
              return;
            }

            const { content, extension } = await withRetry(
              () => github.getFileContent(repoUrl, file.path),
              3,
              2000,
            );

            // добавить очередь через bullMQ
            const chunks = await processFilePipeline(file.path, content, file.sha, extension);

            const smallChunksWithEmbeddings = await embeddings.generateEmbeddings(
              chunks.smallChunks,
            );
            const largeChunksWithEmbeddings = await embeddings.generateEmbeddings(
              chunks.largeChunks,
            );

            await vectorStore.indexChunks(
              collectionName,
              [...smallChunksWithEmbeddings, ...largeChunksWithEmbeddings],
              currentSyncId,
            );

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
      await vectorStore.cleanupOldSyncData(collectionName, currentSyncId);
      logger.info(`Sync completed. ${processed} files handled.`);
    } catch (err) {
      logger.error('Critical failure during sync', err);
      throw err;
    } finally {
      await statusPort.setBusy(false);
    }
  };
};
