import { PrReviewLlmPort } from 'application/pipelines/pr-review/pr-review.contracts';
import * as geminiService from './gemini.service';

export const geminiAdapter: PrReviewLlmPort = {
  reviewSingleFile: geminiService.reviewSingleFile,
  generateSummary: geminiService.generateSummary,
};
