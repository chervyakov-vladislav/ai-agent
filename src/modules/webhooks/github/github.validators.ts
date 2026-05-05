import { z } from 'zod';
import { pinoLogger } from '@shared/infrastructure/logger/pino-logger';
import { AiServiceError } from '@shared/errors/AiServiceError';

const rawReviewCommentSchema = z.object({
  file: z.string(),
  line: z.number().optional(),
  comment: z.string(),
});

export const aiReviewResponseSchema = z.object({
  summary: z.string().min(1, 'Summary is required'),
  reviews: z.array(rawReviewCommentSchema),
});

export const validateAndFormatReview = (rawData: unknown, changedFiles: Set<string>) => {
  const parseResult = aiReviewResponseSchema.safeParse(rawData);

  if (!parseResult.success) {
    pinoLogger.debug(parseResult.error.message);

    throw new AiServiceError('Invalid AI response structure');
  }

  const parsed = parseResult.data;
  const validLineReviews: { file: string; line: number; comment: string }[] = [];
  const extraReviews: { file: string; comment: string }[] = [];

  for (const review of parsed.reviews) {
    if (typeof review.line === 'number' && changedFiles.has(review.file)) {
      validLineReviews.push(review as { file: string; line: number; comment: string });
    } else {
      extraReviews.push({ file: review.file, comment: review.comment });
    }
  }

  const extendedSummary =
    extraReviews.length > 0
      ? `${parsed.summary}\n\n### 📝 Вне контекста строк:\n${extraReviews
          .map((r) => `* **${r.file}**: ${r.comment}`)
          .join('\n')}`
      : parsed.summary;

  return {
    summary: extendedSummary,
    comments: validLineReviews.map((r) => ({
      file: r.file,
      line: r.line,
      comment: r.comment,
    })),
  };
};
