import * as githubService from '@modules/github/github.service';
import { RepoSourcePort } from '@application/use-cases/repo-sync/repo-sync.ports';
import { PullRequestSourcePort } from '@/application/use-cases/analyze-pr/analyze-pr.ports';

export const githubRepoAdapter: RepoSourcePort = {
  getRepositoryInfo: githubService.getRepositoryInfo,
  getRepositoryTree: githubService.getRepositoryTree,
  getFileContent: githubService.getFileContent,
};

export const githubPRAdapter: PullRequestSourcePort = {
  getPullRequestDiff: githubService.getPullRequestDiff,
  createPullRequestReview: githubService.createPullRequestReview,
  getFileContent: githubService.getFileContent,
};
