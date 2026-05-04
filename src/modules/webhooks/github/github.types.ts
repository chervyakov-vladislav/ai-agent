export interface GithubPullRequestEvent {
  action: 'opened' | 'closed' | 'synchronize' | 'reopened' | string;
  pull_request: {
    id: number;
    title: string;
    body: string | null;
    merged: boolean;
    diff_url: string;
    user: {
      login: string;
    };
    head: {
      sha: string;
      ref: string;
    };
    base: {
      ref: string;
    };
  };
}
