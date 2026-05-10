export interface SyncRepoCommand {
  repoUrl: string;
  repoId: string;
}

export interface SyncRepoResponse {
  status: 'accepted' | 'busy';
  message: string;
}
