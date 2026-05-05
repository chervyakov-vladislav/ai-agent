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

interface ValidLineReview {
  file: string;
  line: number;
  comment: string;
}

export const validateAndFormatReview = (rawData: unknown, changedFiles: Set<string>) => {
  const parseResult = aiReviewResponseSchema.safeParse(rawData);

  if (!parseResult.success) {
    pinoLogger.debug(parseResult.error.message);

    throw new AiServiceError('Invalid AI response structure');
  }

  const { summary, reviews } = parseResult.data;
  const validLineReviews = reviews.filter(
    (r): r is ValidLineReview => typeof r.line === 'number' && changedFiles.has(r.file),
  );
  const extraReviews = reviews.filter(
    (r) => typeof r.line !== 'number' || !changedFiles.has(r.file),
  );

  const extendedSummary =
    extraReviews.length > 0
      ? `${summary}\n\n### 📝 Вне контекста строк:\n${extraReviews
          .map((r) => `* **${r.file}**: ${r.comment}`)
          .join('\n')}`
      : summary;

  return {
    summary: extendedSummary,
    comments: validLineReviews.map((r) => ({
      file: r.file,
      line: r.line,
      comment: r.comment,
    })),
  };
};
