import { createSyncFullRepositoryUseCase } from 'application/use-cases/repo-sync/repo-sync.use-case';
import { envConfig } from '@/config/env-config';

import { githubAdapter } from 'modules/github/github.adapter';
import { embeddingsDocumentAdapter } from 'modules/embeddings/embeddings.adapter';
import { qdrantAdapter } from '@modules/vectorstore/qdrant.adapter';
import { syncStatusMemoryAdapter } from '@shared/infrastructure/sync-status.memory.adapter';
import { processFilePipeline } from '@application/pipelines/code-processing/procenning.container';

export const syncFullRepositoryUseCase = createSyncFullRepositoryUseCase({
  statusPort: syncStatusMemoryAdapter,
  github: githubAdapter,
  embeddings: embeddingsDocumentAdapter,
  vectorStore: qdrantAdapter,
  processFilePipeline: processFilePipeline,
  parallelLimit: envConfig.OLLAMA_NUM_PARALLEL,
});
