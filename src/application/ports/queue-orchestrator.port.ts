import { IndexingPayload, AnalysisPayload } from '@application/contracts/queues.types';

export interface QueueOrchestratorPort {
  dispatchIndexing(payload: IndexingPayload): Promise<string>;
  dispatchAnalysis(payload: AnalysisPayload): Promise<string>;
}
