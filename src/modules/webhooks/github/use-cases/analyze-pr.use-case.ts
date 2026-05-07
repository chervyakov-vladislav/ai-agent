import { AIReviewResponse } from '@shared/types/review-context.types';
import { withRetry } from 'shared/utils/axios-utils';
import { validateAndFormatReview } from '../github.validators';
import { AnalyzePRDependencies } from '../github.types';

export const createAnalyzePullRequestUseCase = ({ github, llm }: AnalyzePRDependencies) => {
  return async (prUrl: string, repoUrl: string): Promise<AIReviewResponse> => {
    const [diff, files, repoInfo, readme] = await Promise.all([
      github.getPullRequestDiff(prUrl),
      github.getChangedFiles(prUrl),
      github.getRepositoryInfo(repoUrl),
      github.getRepositoryReadme(repoUrl),
    ]);

    const context = {
      project: {
        name: repoInfo.fullName,
        description: repoInfo.description,
        techStack: repoInfo.topics,
      },
      readme,
      diff,
      files: files.map((f) => ({
        name: f.filename,
        action: f.status,
        body: f.content,
      })),
    };

    const result = await withRetry(() => llm.review(context));
    const changedFilesNames = new Set(files.map((f) => f.filename));
    const { summary, comments } = validateAndFormatReview(result, changedFilesNames);

    await github.createPullRequestReview(prUrl, {
      verdict: 'COMMENT',
      summary,
      comments,
    });

    return result;
  };
};
