import * as githubService from '@modules/github/github.service';
import { RepoSourcePort } from '@application/use-cases/repo-sync/repo-sync.ports';
import { PullRequestSourcePort } from '@/application/use-cases/analyze-pr/analyze-pr.ports';

export const githubAdapter: RepoSourcePort & PullRequestSourcePort = {
  getRepositoryInfo: githubService.getRepositoryInfo,
  getRepositoryTree: githubService.getRepositoryTree,
  getFileContent: githubService.getFileContent,

  getPullRequestDiff: githubService.getPullRequestDiff,
  getChangedFiles: githubService.getChangedFiles,
  createPullRequestReview: githubService.createPullRequestReview,
};
