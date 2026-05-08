import { ReviewContext } from '@shared/types/review-context.types';
import { AIReviewResponse } from './gemini.validator';

export interface IGeminiService {
  reviewCode: (context: ReviewContext) => Promise<AIReviewResponse>;
}
