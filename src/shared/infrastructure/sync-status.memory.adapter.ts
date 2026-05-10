import { SyncStatusPort } from '@/application/use-cases/repo-sync/repo-sync.ports';

let isSyncInProgress = false;

export const syncStatusMemoryAdapter: SyncStatusPort = {
  async isBusy(): Promise<boolean> {
    return isSyncInProgress;
  },

  async setBusy(status: boolean): Promise<void> {
    isSyncInProgress = status;
  },
};
