import pLimit from 'p-limit';
import { logger } from '@shared/infrastructure/logger';
import { withRetry } from '@/shared/infrastructure/clients/http-client.utils';
import { InternalServerError } from '@/shared/errors/500.InternalServerError';
import { AppError } from '@shared/errors/AppError';
import { QdrantModule } from '@modules/vectorstore/qdrant.module';
import { ProcessingModule } from '@modules/processing/processing.module';
import { EmbeddingModule } from '@modules/embeddings/embeddings.module';
import { GithubModule } from '@modules/webhooks/github/github.module';

interface SyncDependencies {
  github: GithubModule;
  processing: ProcessingModule;
  embeddings: EmbeddingModule;
  vectorStore: QdrantModule;
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

export const createSyncFullRepositoryUseCase = ({
  github,
  processing,
  embeddings,
  vectorStore,
  parallelLimit,
}: SyncDependencies) => {
  return async (repoId: string): Promise<void> => {
    const collectionName = repoId.replace(/\//g, '_');
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

          const chunks = await processing.processFile(file.path, content, file.sha, extension);
          const chunksWithEmbeddings = await embeddings.generateEmbeddings(chunks);

          await vectorStore.indexChunks(collectionName, chunksWithEmbeddings, currentSyncId);

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
  };
};
