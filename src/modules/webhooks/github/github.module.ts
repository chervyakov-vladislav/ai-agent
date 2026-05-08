import * as githubService from '@modules/webhooks/github/github.service';
import { reviewCode } from '@modules/llm-gemini/gemini.service';
import { createAnalyzePullRequestUseCase } from '@modules/webhooks/github/use-cases/analyze-pr.use-case';

export const analyzePullRequestUseCase = createAnalyzePullRequestUseCase({
  github: githubService,
  llm: { reviewCode },
});
