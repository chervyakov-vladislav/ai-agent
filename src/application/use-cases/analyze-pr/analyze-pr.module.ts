import { createAnalyzePullRequestUseCase } from '@application/use-cases/analyze-pr/analyze-pr.use-case';
import { geminiModule } from '@modules/llm-gemini/gemini.module';
import { githubAdapter } from 'modules/github/github.adapter';

export const analyzePullRequestUseCase = createAnalyzePullRequestUseCase({
  github: githubAdapter,
  llm: geminiModule,
});
