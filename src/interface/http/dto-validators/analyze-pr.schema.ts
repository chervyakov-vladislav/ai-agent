import { z } from 'zod';

enum GithubAction {
  Opened = 'opened',
  Synchronize = 'synchronize',
  Closed = 'closed',
}

export const GithubWebhookSchema = z
  .object({
    headers: z.object({
      'x-github-event': z.string(),
    }),
    body: z.object({
      action: z.string(),
      number: z.number(),
      pull_request: z.object({
        url: z.url(),
        id: z.number(),
        number: z.number(),
        title: z.string(),
        merged: z.boolean(),
        diff_url: z.url(),
        user: z.object({
          login: z.string(),
        }),
        head: z.object({
          sha: z.string(),
          ref: z.string(),
        }),
        base: z.object({
          ref: z.string(),
        }),
      }),
      repository: z.object({
        html_url: z.url(),
        name: z.string(),
        full_name: z.string(),
        topics: z.array(z.string()).optional(),
        language: z.string().nullable().optional(),
        default_branch: z.string(),
      }),
    }),
  })
  .transform((data) => {
    const event = data.headers['x-github-event'];
    if (event !== 'pull_request') return null;

    const { action, pull_request: pr, repository: repo } = data.body;

    const shouldAnalyze = action === GithubAction.Opened || action === GithubAction.Synchronize;
    const isMerged = action === GithubAction.Closed && pr.merged === true;
    const isDefaultBranch = pr.base.ref === repo.default_branch;
    const shouldSync = isMerged && isDefaultBranch;

    return {
      analyzeCommand: shouldAnalyze
        ? {
            prUrl: pr.url,
            repoUrl: `https://api.github.com/repos/${repo.full_name}`,
          }
        : null,
      syncCommand: shouldSync
        ? {
            repoId: repo.full_name,
          }
        : null,
      metadata: {
        prNumber: pr.number,
        author: pr.user.login,
        commitHash: pr.head.sha,
      },
    };
  });
