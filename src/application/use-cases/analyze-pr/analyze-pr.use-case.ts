import { AIReviewResponse } from '@contracts/llm.types';
import { validateAndFormatReview } from '@modules/github/github.validators';
import {
  CodeSearchPort,
  EmbeddingQueryPort,
  LlmPort,
  PullRequestSourcePort,
} from './analyze-pr.ports';

export interface AnalyzePRDependencies {
  github: PullRequestSourcePort;
  llm: LlmPort;
  vectorstore: CodeSearchPort;
  embeddings: EmbeddingQueryPort;
  parallelLimit: number;
}

export const createAnalyzePullRequestUseCase = ({
  github,
  llm,
  vectorstore,
  embeddings,
}: AnalyzePRDependencies) => {
  return async (prUrl: string, collectionName: string): Promise<AIReviewResponse> => {
    const diff = (await github.getPullRequestDiff(prUrl)).slice(3, 4);

    for (const file of diff) {
      const searchQuery = file.chunks
        .map((c) => c.vectorQuery)
        .filter((q) => q.length > 10)
        .join('\n---\n');

      if (!searchQuery) continue;

      const queryVector = await embeddings.generateQueryEmbedding(searchQuery);

      const parentIds = await vectorstore.findSimilarNodeIds(
        collectionName,
        queryVector,
        file.strategy.limit,
      );

      const content = await vectorstore.getReconstructedChunks(collectionName, parentIds);
    }

    // const context = {
    //   project: {
    //     name: repoInfo.fullName,
    //     description: repoInfo.description,
    //     techStack: repoInfo.topics,
    //   },
    //   diff,
    //   files: files.map((f) => ({
    //     name: f.filename,
    //     action: f.status,
    //     body: f.content,
    //   })),
    // };

    // const result = await withRetry(() => llm.reviewCode(context));
    // const { summary, reviews } = validateAndFormatReview(result, diff);

    // await github.createPullRequestReview(prUrl, {
    //   verdict: 'COMMENT',
    //   summary,
    //   reviews,
    // });

    // return result;
  };
};
