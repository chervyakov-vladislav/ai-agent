import { createAnalyzePullRequestUseCase } from '@application/use-cases/analyze-pr/analyze-pr.use-case';
import { geminiAdapter } from 'modules/llm-gemini/gemini.adapter';
import { githubAdapter } from 'modules/github/github.adapter';
import { qdrantVectorSearchAdapter } from '@modules/vectorstore/qdrant.adapter';
import { embeddingsQueryAdapter } from '@modules/embeddings/embeddings.adapter';
import { envConfig } from '@config/env-config';

export const analyzePullRequestUseCase = createAnalyzePullRequestUseCase({
  github: githubAdapter,
  llm: geminiAdapter,
  vectorstore: qdrantVectorSearchAdapter,
  embeddings: embeddingsQueryAdapter,
  parallelLimit: envConfig.OLLAMA_NUM_PARALLEL,
});
