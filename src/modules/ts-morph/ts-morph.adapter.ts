import * as tsMorphService from './ts-morph.service';

/**
 * Адаптер для модуля ts-morph.
 */
export const tsMorphAdapter = {
  extractSymbols: tsMorphService.extractSymbols,
  extractImports: tsMorphService.extractImports,
  removeImports: tsMorphService.removeImports,
};
