import { createAnalyzePullRequestUseCase } from '@application/use-cases/analyze-pr/analyze-pr.use-case';
import { geminiAdapter } from 'modules/llm-gemini/gemini.adapter';
import { githubPRAdapter } from 'modules/github/github.adapter';
import { qdrantVectorSearchAdapter } from '@modules/vectorstore/qdrant.adapter';
import { embeddingsQueryAdapter } from '@modules/embeddings/embeddings.adapter';
import { envConfig } from '@config/env-config';
import { astParserSearchAdapter } from '@modules/ast-parser/ast-parser.adapter';

export const analyzePullRequestUseCase = createAnalyzePullRequestUseCase({
  github: githubPRAdapter,
  codeSearching: astParserSearchAdapter,
  embeddings: embeddingsQueryAdapter,
  vectorstore: qdrantVectorSearchAdapter,
  llm: geminiAdapter,
  parallelLimit: envConfig.OLLAMA_NUM_PARALLEL,
});
