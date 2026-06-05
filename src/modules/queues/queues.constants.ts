export const JobPriority = {
  HIGH: 1,
  LOW: 10,
} as const;

export const QUEUE_NAMES = {
  ANALYSIS: 'analysis-queue',
  INDEXING: 'indexing-queue',
} as const;

export const JOB_NAMES = {
  INDEX_CODEBASE: 'INDEX_CODEBASE',
  ANALYZE_PR: 'ANALYZE_PR',
} as const;
