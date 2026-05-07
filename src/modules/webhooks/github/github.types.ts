import { GithubFileStatus } from '@shared/types/action.enums';

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
