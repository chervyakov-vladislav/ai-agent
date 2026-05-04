import { GithubPullRequestEvent } from './github.types';

export interface NormalizedPR {
  id: number;
  title: string;
  author: string;
  action: 'opened' | 'updated' | 'merged' | 'closed';
  diffUrl: string;
  branch: string;
}

export const mapGithubToPR = (
  event: string,
  payload: GithubPullRequestEvent,
): NormalizedPR | null => {
  if (event !== 'pull_request') return null;

  const pr = payload.pull_request;

  let action: NormalizedPR['action'] | null = null;

  if (payload.action === 'opened') action = 'opened';
  else if (payload.action === 'synchronize') action = 'updated';
  else if (payload.action === 'closed') {
    action = pr.merged ? 'merged' : 'closed';
  }

  if (!action) return null;

  return {
    id: pr.id,
    title: pr.title,
    author: pr.user.login,
    action,
    diffUrl: pr.diff_url,
    branch: pr.head.ref,
  };
};
