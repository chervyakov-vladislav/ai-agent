import * as githubService from '@/modules/webhooks/github/github.service';
import { createSyncFullRepositoryUseCase } from '@/modules/repo-sync/use-cases/sync-full-repository';

export const syncFullRepositoryUseCase = createSyncFullRepositoryUseCase({
  github: githubService,
  // processing: processingService,
  // vectorStore: vectorStoreService,
});
