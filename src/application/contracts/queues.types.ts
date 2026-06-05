export interface IndexingPayload {
  repoId: string;
  repoUrl: string;
  commitHash?: string;
}

export interface AnalysisPayload {
  repoId: string;
  prId: string;
  prUrl: string;
}
