import { AIReviewResponse, ReviewContext } from '@contracts/llm.types';
import { FilteredFileDiff, GetFileContentParams, Range } from '@contracts/github.types';
import {
  ChangedCodeBlock,
  DiffSearchStrategy,
  ProcessedChunk,
  QdrantChunkPoint,
  SplitSearchQueryParam,
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
  createPullRequestReview(
    prUrl: string,
    review: AIReviewResponse,
    commitHash: string,
  ): Promise<void>;
  getFileContent(params: GetFileContentParams): Promise<{ content: string }>;
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
  extractChangedCodeBlocks(
    filename: string,
    content: string,
    changedRanges: Range[],
  ): ChangedCodeBlock[];
}

export interface CodeSplitterSearchQueryPort {
  splitSearchQuery: ({
    searchQuery,
    chunkSize,
    chunkOverlap,
  }: SplitSearchQueryParam) => Promise<string[]>;
}

export interface EmbeddingCachePort {
  get(text: string): Promise<number[] | null>;
  save(text: string, vector: number[]): Promise<void>;
}
