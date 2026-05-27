import { AIReviewResponse, ReviewComment } from '@contracts/llm.types';

export interface PreparedDiffWithContext {
  diffData: string;
  relevantCode: string;
}

export type PrReviewPipeline = (diffs: PreparedDiffWithContext[]) => Promise<AIReviewResponse>;

export interface PrReviewLlmPort {
  reviewSingleFile(diffData: string, vectorContext: string): Promise<{ reviews: ReviewComment[] }>;

  generateSummary(step1Outputs: { reviews: ReviewComment[] }[]): Promise<AIReviewResponse>;
}
