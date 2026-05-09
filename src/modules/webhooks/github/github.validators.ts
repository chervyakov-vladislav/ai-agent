import { z } from 'zod';
import parse from 'parse-diff';
import { logger } from '@shared/infrastructure/logger/pino-logger';
import { AiServiceError } from 'shared/errors/502.AiServiceError';
import { FilteredFileDiff, ReviewComment } from './github.types';

const rawReviewCommentSchema = z.object({
  file: z.string(),
  line: z.number().optional(),
  comment: z.string(),
});

export const aiReviewResponseSchema = z.object({
  summary: z.string().min(1, 'Summary is required'),
  reviews: z.array(rawReviewCommentSchema),
});

const getValidLinesForFile = (rawDiff: string): Set<number> => {
  const diff = parse(rawDiff);
  const validLines = new Set<number>();

  diff.forEach((file) => {
    file.chunks.forEach((chunk) => {
      chunk.changes.forEach((change) => {
        if ('ln' in change && change.ln) {
          validLines.add(change.ln);
        }
      });
    });
  });
  return validLines;
};

export const validateAndFormatReview = (rawData: unknown, diffData: FilteredFileDiff[]) => {
  const parseResult = aiReviewResponseSchema.safeParse(rawData);

  if (!parseResult.success) {
    logger.error('Zod Validation Failed', parseResult.error.issues);
    throw new AiServiceError('Invalid AI response structure');
  }

  const { summary, reviews } = parseResult.data;

  const fileValidLinesMap = new Map<string, Set<number>>(
    diffData.map((d) => [d.path, getValidLinesForFile(d.rawDiff)]),
  );

  const validComments: ReviewComment[] = [];
  const extraNotes: string[] = [];
  reviews.forEach((rev) => {
    const validLines = fileValidLinesMap.get(rev.file);

    if (!validLines || !rev.line || !validLines.has(rev.line)) {
      const lineInfo = rev.line ? ` (строка ${rev.line})` : '';
      extraNotes.push(`**${rev.file}${lineInfo}**: ${rev.comment}`);
    } else {
      validComments.push({
        file: rev.file,
        line: rev.line,
        comment: rev.comment,
      });
    }
  });

  let extendedSummary = summary;
  if (extraNotes.length > 0) {
    extendedSummary += `\n\n### 📝 Дополнительные замечания:\n${extraNotes.map((n) => `* ${n}`).join('\n')}`;
  }

  return {
    summary: extendedSummary,
    comments: validComments,
  };
};

export const githubContentSchema = z.string().min(1, 'Content is empty');
