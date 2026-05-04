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

  return result;
};
