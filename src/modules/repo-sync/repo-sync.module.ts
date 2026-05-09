import * as githubService from '@modules/webhooks/github/github.service';
import { createSyncFullRepositoryUseCase } from '@modules/repo-sync/use-cases/sync-full-repository';
import { processingModule } from '@modules/processing/processing.module';
import { envConfig } from '@/config/env-config';

export const syncFullRepositoryUseCase = createSyncFullRepositoryUseCase({
  github: githubService,
  processing: processingModule,
  // vectorStore: vectorStoreService,
  parallelLimit: Number(envConfig.OLLAMA_NUM_PARALLEL),
});
