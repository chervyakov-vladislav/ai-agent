import { geminiAdapter } from '@modules/llm-gemini/gemini.adapter';
import { createPrReviewPipeline } from './pr-review.pipeline';
import { PrReviewPipeline } from './pr-review.contracts';
import { logger } from '@shared/infrastructure/logger';

/**
 * Контейнер для внедрения зависимостей в пайплайн рецензирования Pull Request-ов.
 * Связывает чистую бизнес-логику пайплайна с инфраструктурным адаптером Gemini.
 */
export const prReviewPipeline: PrReviewPipeline = createPrReviewPipeline({
  llm: geminiAdapter,
  logger,
});
