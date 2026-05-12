import { AIReviewResponse } from '@contracts/llm.types';
import { FilteredFileDiff } from '@contracts/github.types';
import { ReviewContext } from '@contracts/llm.types';
import { DiffSearchStrategy, ProcessedChunk } from '@contracts/code-analysis.types';

export interface CodeSearchPort {
  findSimilarNodeIds(
    collectionName: string,
    queryEmbedding: number[],
    strategy: DiffSearchStrategy,
  ): Promise<string[]>;

  getReconstructedChunks(collectionName: string, parentIds: string[]): Promise<ProcessedChunk[]>;
}

export interface PullRequestSourcePort {
  getPullRequestDiff(prUrl: string): Promise<FilteredFileDiff[]>;
  createPullRequestReview(prUrl: string, review: AIReviewResponse): Promise<void>;
}

export interface LlmPort {
  reviewCode(context: ReviewContext): Promise<AIReviewResponse>;
}

export interface EmbeddingQueryPort {
  generateQueryEmbedding(query: string): Promise<number[]>;
}

export interface SearchCodeStrategyPort {
  getStrategy({
    isNew,
    isRenamed,
    extension,
    additions,
  }: {
    isNew: boolean;
    isRenamed: boolean;
    extension: string;
    additions: number;
  }): DiffSearchStrategy;
}
