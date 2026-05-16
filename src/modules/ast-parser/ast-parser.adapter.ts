import * as astParserService from './ast-parser.service';
import { SearchCodeStrategyPort } from '@/application/use-cases/analyze-pr/analyze-pr.ports';

/**
 * Адаптер для индексации кода (извлечение символов, подготовка документов).
 */
export const astParserIndexingAdapter = {
  extractSymbols: astParserService.extractSymbols,
  extractImports: astParserService.extractImports,
  removeImports: astParserService.removeImports,
  prepareDocumentInputs: astParserService.prepareDocumentInputs,
  createSkeleton: astParserService.createSkeleton,
  makeSymbolId: astParserService.makeSymbolId,
  removeComments: astParserService.removeComments,
};

/**
 * Адаптер для поиска по коду (определение стратегии поиска, реконструкция чанков).
 */
export const astParserSearchAdapter: SearchCodeStrategyPort = {
  getStrategy: astParserService.getSearchStrategy,
  reconstructChunks: astParserService.reconstructChunks,
};
