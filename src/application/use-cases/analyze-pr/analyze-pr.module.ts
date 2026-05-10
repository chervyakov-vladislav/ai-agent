import { createAnalyzePullRequestUseCase } from '@application/use-cases/analyze-pr/analyze-pr.use-case';
import { geminiAdapter } from 'modules/llm-gemini/gemini.adapter';
import { githubAdapter } from 'modules/github/github.adapter';

export const analyzePullRequestUseCase = createAnalyzePullRequestUseCase({
  github: githubAdapter,
  llm: geminiAdapter,
});
