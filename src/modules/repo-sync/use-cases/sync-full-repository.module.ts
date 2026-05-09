import { createSyncFullRepositoryUseCase } from '@modules/repo-sync/use-cases/sync-full-repository';
import { processingModule } from '@modules/processing/processing.module';
import { envConfig } from '@/config/env-config';
import { embeddingsModule } from '@modules/embeddings/embeddings.module';
import { qdrantModule } from '@modules/vectorstore/qdrant.module';
import { githubModule } from '@modules/webhooks/github/github.module';

export const syncFullRepositoryUseCase = createSyncFullRepositoryUseCase({
  github: githubModule,
  processing: processingModule,
  embeddings: embeddingsModule,
  vectorStore: qdrantModule,
  parallelLimit: envConfig.OLLAMA_NUM_PARALLEL,
});
