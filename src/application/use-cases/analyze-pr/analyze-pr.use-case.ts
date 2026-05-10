import { AIReviewResponse } from '@application/contracts/llm.types';
import { withRetry } from '@shared/infrastructure/clients/http-client.utils';
import { validateAndFormatReview } from 'modules/github/github.validators';
import { LlmPort, PullRequestSourcePort } from './analyze-pr.ports';

export interface AnalyzePRDependencies {
  github: PullRequestSourcePort;
  llm: LlmPort;
}

export const createAnalyzePullRequestUseCase = ({ github, llm }: AnalyzePRDependencies) => {
  return async (prUrl: string, repoUrl: string): Promise<AIReviewResponse> => {
    const [diff, files, repoInfo] = await withRetry(
      () =>
        Promise.all([
          github.getPullRequestDiff(prUrl),
          github.getChangedFiles(prUrl),
          github.getRepositoryInfo(repoUrl),
        ]),
      3,
      2000,
    );

    const context = {
      project: {
        name: repoInfo.fullName,
        description: repoInfo.description,
        techStack: repoInfo.topics,
      },
      diff,
      files: files.map((f) => ({
        name: f.filename,
        action: f.status,
        body: f.content,
      })),
    };

    const result = await withRetry(() => llm.reviewCode(context));
    const { summary, reviews } = validateAndFormatReview(result, diff);

    await github.createPullRequestReview(prUrl, {
      verdict: 'COMMENT',
      summary,
      reviews,
    });

    return result;
  };
};
