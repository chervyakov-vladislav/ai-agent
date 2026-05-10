import {
  ChangedFile,
  CreateReviewInput,
  FilteredFileDiff,
  RepositoryMetadata,
} from '@application/contracts/github.types';

export interface PullRequestSourcePort {
  getPullRequestDiff(prUrl: string): Promise<FilteredFileDiff[]>;
  getChangedFiles(prUrl: string): Promise<ChangedFile[]>;
  getRepositoryInfo(repoUrl: string): Promise<RepositoryMetadata>;
  createPullRequestReview(prUrl: string, review: CreateReviewInput): Promise<void>;
}
