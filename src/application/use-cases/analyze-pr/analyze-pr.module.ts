import { createAnalyzePullRequestUseCase } from '@application/use-cases/analyze-pr/analyze-pr.use-case';
import { githubPRAdapter } from '@modules/github/github.adapter';
import { qdrantVectorSearchAdapter } from '@modules/vectorstore/qdrant.adapter';
import { embeddingsQueryAdapter } from '@modules/embeddings/embeddings.adapter';
import { envConfig } from '@config/env-config';
import { astParserSearchAdapter } from '@modules/ast-parser/ast-parser.adapter';
import { langchainSearchQueryAdapter } from '@modules/langchain/langchain.adapter';
import { logger } from 'shared/infrastructure/logger';
import { prReviewPipeline } from '@application/pipelines/pr-review/pr-review.container';

export const analyzePullRequestUseCase = createAnalyzePullRequestUseCase({
  github: githubPRAdapter,
  codeSearching: astParserSearchAdapter,
  embeddings: embeddingsQueryAdapter,
  vectorstore: qdrantVectorSearchAdapter,
  codeSplitter: langchainSearchQueryAdapter,
  parallelLimit: envConfig.OLLAMA_NUM_PARALLEL,
  logger: logger,
  prReviewPipeline: prReviewPipeline,
});
