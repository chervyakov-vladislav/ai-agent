import { SearchCodeStrategyPort } from '@/application/use-cases/analyze-pr/analyze-pr.ports';
import { getSearchStrategy } from './code-searching-processing.service';

export const codeSearchingProcessingDiffAdapter: SearchCodeStrategyPort = {
  getStrategy: getSearchStrategy,
};
