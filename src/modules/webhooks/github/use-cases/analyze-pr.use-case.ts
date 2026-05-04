import { geminiService } from '@/modules/llm-gemini/gemini.service';
import { AiServiceError } from '@shared/errors/AiServiceError';
import { AIReviewResponse } from '@shared/types/review-context.types';
import * as githubService from '../github.service';

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

  const result = await geminiService.review(context);

  if (!result.summary) {
    throw new AiServiceError('Empty summary', 'EMPTY_SUMMARY');
  }

  const changedFilesNames = new Set(files.map((f) => f.filename));

  const validLineReviews = result.reviews
    .filter((r) => typeof r.line === 'number')
    .filter((r) => changedFilesNames.has(r.file))
    .filter((r): r is typeof r & { line: number } => r.line !== undefined);

  const extraReviews = result.reviews.filter(
    (r) => typeof r.line !== 'number' || !changedFilesNames.has(r.file),
  );

  const extendedSummary =
    extraReviews.length > 0
      ? `${result.summary}\n\n### 📝 Вне контекста строк:\n${extraReviews.map((r) => `* **${r.file}**: ${r.comment}`).join('\n')}`
      : result.summary;

  await githubService.createPullRequestReview(prUrl, {
    verdict: 'COMMENT',
    summary: extendedSummary,
    comments: validLineReviews.map((r) => ({
      file: r.file,
      line: r.line,
      comment: r.comment,
    })),
  });

  return result;
};
