import { createSyncFullRepositoryUseCase } from 'application/use-cases/repo-sync/repo-sync.use-case';
import { envConfig } from '@/config/env-config';

import { githubAdapter } from 'modules/github/github.adapter';
import { embeddingsAdapter } from 'modules/embeddings/embeddings.adapter';
import { qdrantAdapter } from '@modules/vectorstore/qdrant.adapter';
import { syncStatusMemoryAdapter } from '@shared/infrastructure/sync-status.memory.adapter';
import { processFile } from '@application/pipelines/code-processing/procenning.container';

export const syncFullRepositoryUseCase = createSyncFullRepositoryUseCase({
  statusPort: syncStatusMemoryAdapter,
  github: githubAdapter,
  embeddings: embeddingsAdapter,
  vectorStore: qdrantAdapter,
  codeProcessingPipeline: processFile,
  parallelLimit: envConfig.OLLAMA_NUM_PARALLEL,
});
