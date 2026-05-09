import { createAnalyzePullRequestUseCase } from '@modules/webhooks/github/use-cases/analyze-pr.use-case';
import { githubModule } from '../github.module';
import { geminiModule } from '@modules/llm-gemini/gemini.module';

export const analyzePullRequestUseCase = createAnalyzePullRequestUseCase({
  github: githubModule,
  llm: geminiModule,
});
