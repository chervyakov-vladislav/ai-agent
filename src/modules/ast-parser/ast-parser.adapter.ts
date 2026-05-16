import * as astParserService from './ast-parser.service';

/**
 * Адаптер для модуля AST-парсера.
 */
export const astParserAdapter = {
  extractSymbols: astParserService.extractSymbols,
  extractImports: astParserService.extractImports,
  removeImports: astParserService.removeImports,
};
