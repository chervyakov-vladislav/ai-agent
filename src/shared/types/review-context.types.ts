import { GithubFileStatus } from './action.enums';

export interface ReviewFile {
  name: string;
  action: GithubFileStatus;
  body: string;
}

export interface ProjectInfo {
  name: string;
  description: string | null;
  techStack: string[];
}

export interface ReviewContext {
  project: ProjectInfo;
  diff: string;
  files: ReviewFile[];
}

export interface AIReviewResponse {
  isSafe: boolean;
  verdict: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
  summary: string;
  reviews: {
    file: string;
    line?: number;
    comment: string;
  }[];
}
