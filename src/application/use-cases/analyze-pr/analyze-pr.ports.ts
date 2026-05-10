import { AIReviewResponse } from '@application/contracts/llm.types';
import {
  ChangedFile,
  FilteredFileDiff,
  RepositoryMetadata,
} from '@application/contracts/github.types';
import { ReviewContext } from '@application/contracts/llm.types';

export interface PullRequestSourcePort {
  getPullRequestDiff(prUrl: string): Promise<FilteredFileDiff[]>;
  getChangedFiles(prUrl: string): Promise<ChangedFile[]>;
  getRepositoryInfo(repoUrl: string): Promise<RepositoryMetadata>;
  createPullRequestReview(prUrl: string, review: AIReviewResponse): Promise<void>;
}

export interface LlmPort {
  reviewCode(context: ReviewContext): Promise<AIReviewResponse>;
}
