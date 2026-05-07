import { GithubFileStatus } from '@shared/types/action.enums';
import { AIReviewResponse, ReviewContext } from '@shared/types/review-context.types';

export interface GithubPullRequestEvent {
  action: string;
  number: number;
  pull_request: {
    id: number;
    url: string;
    number: number;
    title: string;
    body: string | null;
    merged: boolean;
    diff_url: string;
    user: { login: string };
    head: { sha: string; ref: string };
    base: { ref: string };
  };
  repository: {
    url: string;
    name: string;
    full_name: string;
    description: string | null;
    topics?: string[];
    language?: string | null;
  };
}

export interface ChangedFile {
  filename: string;
  status: GithubFileResponse['status'];
  content: string;
}
export interface RepositoryMetadata {
  fullName: string;
  description: string | null;
  topics: string[];
  language: string | null;
  defaultBranch: string;
}

export interface GithubFileResponse {
  sha: string;
  filename: string;
  status: GithubFileStatus;
  additions: number;
  deletions: number;
  changes: number;
  blob_url: string;
  raw_url: string;
  contents_url: string;
  patch?: string;
}

export interface FilteredFileDiff {
  path: string;
  fileName: string;
  extension: string;
  rawDiff: string;
  promptData: string;
  chunksCount: number;
}

export interface ReviewComment {
  file: string;
  line: number;
  comment: string;
}

export interface CreateReviewInput {
  verdict: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
  summary: string;
  comments: ReviewComment[];
}

export interface AnalyzePRDependencies {
  github: {
    getPullRequestDiff: (url: string) => Promise<FilteredFileDiff[]>;
    getChangedFiles: (url: string) => Promise<ChangedFile[]>;
    getRepositoryInfo: (url: string) => Promise<RepositoryMetadata>;
    createPullRequestReview: (url: string, review: CreateReviewInput) => Promise<void>;
  };
  llm: {
    review: (context: ReviewContext) => Promise<AIReviewResponse>;
  };
}
