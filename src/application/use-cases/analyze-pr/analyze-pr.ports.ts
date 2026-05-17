import { AIReviewResponse } from '@contracts/llm.types';
import { FilteredFileDiff } from '@contracts/github.types';
import { ReviewContext } from '@contracts/llm.types';
import {
  DiffSearchStrategy,
  ProcessedChunk,
  QdrantChunkPoint,
} from '@contracts/code-analysis.types';

export interface CodeSearchPort {
  findHybridSimilarNodeIds(
    collectionName: string,
    queryEmbedding: number[],
    queryText: string,
    strategy: DiffSearchStrategy,
  ): Promise<string[]>;

  getPoints(collectionName: string, parentIds: string[]): Promise<QdrantChunkPoint[]>;
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
  reconstructChunks(points: QdrantChunkPoint[]): ProcessedChunk[];
}
