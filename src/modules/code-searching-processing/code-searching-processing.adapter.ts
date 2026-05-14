import { SearchCodeStrategyPort } from '@/application/use-cases/analyze-pr/analyze-pr.ports';
import { getSearchStrategy, reconstructChunks } from './code-searching-processing.service';

export const codeSearchingProcessingDiffAdapter: SearchCodeStrategyPort = {
  getStrategy: getSearchStrategy,
  reconstructChunks: reconstructChunks,
};
