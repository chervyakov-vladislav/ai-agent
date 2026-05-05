import { z } from 'zod';

export const aiReviewSchema = z.object({
  isSafe: z.boolean(),
  verdict: z.enum(['APPROVE', 'REQUEST_CHANGES', 'COMMENT']),
  summary: z.string().min(1, 'Summary cannot be empty'),
  reviews: z.array(
    z.object({
      file: z.string(),
      line: z.number().int().positive(),
      comment: z.string(),
    }),
  ),
});

export const safeJsonParse = (val: unknown) => {
  if (typeof val !== 'string') return val;
  try {
    const cleaned = val.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return undefined;
  }
};

export const aiReviewResponseSchema = z.preprocess(safeJsonParse, aiReviewSchema);

export type AIReviewResponse = z.infer<typeof aiReviewResponseSchema>;
