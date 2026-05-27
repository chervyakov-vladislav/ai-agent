import { AIReviewResponse, ReviewComment } from '@contracts/llm.types';
import { PrReviewPipeline, PrReviewLlmPort, PreparedDiffWithContext } from './pr-review.contracts';
import { Logger } from 'shared/infrastructure/logger';

interface PipelineDependencies {
  llm: PrReviewLlmPort;
  logger: Logger;
}

/**
 * Фабрика для создания пайплайна инспекции PR с внедрением зависимостей (DI).
 * Оркеструет пофайлный анализ изменений и сборку финального вердикта.
 */
export const createPrReviewPipeline = ({ llm, logger }: PipelineDependencies): PrReviewPipeline => {
  return async (diffs: PreparedDiffWithContext[]): Promise<AIReviewResponse> => {
    const step1Outputs: { reviews: ReviewComment[] }[] = [];

    for (const diff of diffs) {
      const item = diff;
      logger.info(`[LLM Pipeline] Analyzing ${item.diffData.split('\n')[0]}`);

      try {
        const singleFileResult = await llm.reviewSingleFile(item.diffData, item.relevantCode);

        logger.info(JSON.stringify(singleFileResult, null, 2));

        step1Outputs.push(singleFileResult);
      } catch (error) {
        logger.error(`[LLM Pipeline] Error analyzing for ${item.diffData.split('\n')[0]}`, error);
        throw error;
      }
    }

    logger.info('[Pipeline] Generating final PR summary and verdict...');

    const finalReview: AIReviewResponse = await llm.generateSummary(step1Outputs);

    logger.info(JSON.stringify(finalReview, null, 2));

    logger.info(`[Pipeline] Review completed. Verdict: ${finalReview.verdict}`);
    return finalReview;
  };
};
