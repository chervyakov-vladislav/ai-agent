import { GithubAction } from '@shared/types/action.enums';
import { GithubPullRequestEvent } from './github.types';

export interface NormalizedPR {
  id: number;
  number: number;
  title: string;
  author: string;
  action: GithubAction;
  url: string;
  repoUrl: string;
  diffUrl: string;
  branch: string;
}

export const mapGithubToPR = (
  event: string,
  payload: GithubPullRequestEvent,
): NormalizedPR | null => {
  if (event !== 'pull_request') return null;

  const pr = payload.pull_request;
  const repo = payload.repository;

  const action = payload.action === GithubAction.Opened ? GithubAction.Opened : false;

  if (!action) return null;

  return {
    id: pr.id,
    number: pr.number,
    title: pr.title,
    author: pr.user.login,
    action,
    url: pr.url,
    repoUrl: repo.url || `https://api.github.com/repos/${repo.full_name}`,
    diffUrl: pr.diff_url,
    branch: pr.head.ref,
  };
};
