import * as githubService from '@modules/webhooks/github/github.service';

export const githubModule = {
  getRepositoryInfo: githubService.getRepositoryInfo,
  getRepositoryTree: githubService.getRepositoryTree,
  getFileContent: githubService.getFileContent,
  getChangedFiles: githubService.getChangedFiles,
  getPullRequestDiff: githubService.getPullRequestDiff,
  createPullRequestReview: githubService.createPullRequestReview,
};

export type GithubModule = typeof githubModule;
