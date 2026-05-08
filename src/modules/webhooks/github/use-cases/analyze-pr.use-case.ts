import { AIReviewResponse } from '@shared/types/review-context.types';
import { withRetry } from 'shared/infrastructure/clients/http-client.utils';
import { validateAndFormatReview } from '../github.validators';
import { AnalyzePRDependencies } from '../github.types';

export const createAnalyzePullRequestUseCase = ({ github, llm }: AnalyzePRDependencies) => {
  return async (prUrl: string, repoUrl: string): Promise<AIReviewResponse> => {
    const [diff, files, repoInfo] = await Promise.all([
      github.getPullRequestDiff(prUrl),
      github.getChangedFiles(prUrl),
      github.getRepositoryInfo(repoUrl),
    ]);

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
    const { summary, comments } = validateAndFormatReview(result, diff);

    await github.createPullRequestReview(prUrl, {
      verdict: 'COMMENT',
      summary,
      comments,
    });

    return result;
  };
};
