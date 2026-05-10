import { z } from 'zod';

export const aiReviewSchema = z.object({
  isSafe: z.boolean(),
  verdict: z.enum(['APPROVE', 'REQUEST_CHANGES', 'COMMENT']),
  summary: z.string(),
  reviews: z.array(
    z.object({
      file: z.string(),
      line: z.number().int(),
      comment: z.string(),
    }),
  ),
});

export const safeJsonParse = (val: unknown) => {
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    return undefined;
  }
};

export const aiReviewResponseSchema = z.preprocess(safeJsonParse, aiReviewSchema);
