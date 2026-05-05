import { geminiService } from '@/modules/llm-gemini/gemini.service';
import { AIReviewResponse } from '@shared/types/review-context.types';
import { withRetry } from '@shared/infrastructure/axios/axios-utils';
import * as githubService from '../github.service';
import { validateAndFormatReview } from '../github.validators';

export const analyzePullRequestUseCase = async (
  prUrl: string,
  repoUrl: string,
): Promise<AIReviewResponse> => {
  const [diff, files, repoInfo] = await Promise.all([
    githubService.getPullRequestDiff(prUrl),
    githubService.getChangedFiles(prUrl),
    githubService.getRepositoryInfo(repoUrl),
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

  const result = await withRetry(() => geminiService.review(context));
  const changedFilesNames = new Set(files.map((f) => f.filename));
  const { summary, comments } = validateAndFormatReview(result, changedFilesNames);

  await githubService.createPullRequestReview(prUrl, {
    verdict: 'COMMENT',
    summary,
    comments,
  });

  return result;
};
