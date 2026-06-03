import { IndexingPayload, AnalysisPayload } from '@application/contracts/queues.types';

export type TaskType = 'INDEX_CODEBASE' | 'ANALYZE_PR';

export type QueueJobPayload = IndexingPayload | AnalysisPayload;

export type { IndexingPayload, AnalysisPayload };
