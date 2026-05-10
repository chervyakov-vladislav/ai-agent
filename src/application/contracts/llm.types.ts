import { FilteredFileDiff, GithubFileStatus } from '@application/contracts/github.types';

interface ReviewFile {
  name: string;
  action: GithubFileStatus;
  body: string;
}

interface ProjectInfo {
  name: string;
  description: string | null;
  techStack: string[];
}

export interface ReviewContext {
  project: ProjectInfo;
  diff: FilteredFileDiff[];
  readme?: string | null;
  files: ReviewFile[];
}

export interface AIReviewResponse {
  isSafe?: boolean;
  verdict: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
  summary: string;
  reviews: ReviewComment[];
}

export interface ReviewComment {
  file: string;
  line?: number;
  comment: string;
}
