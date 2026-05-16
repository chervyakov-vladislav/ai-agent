import { createHash } from 'node:crypto';
import { BaseSymbol } from '@contracts/code-analysis.types';

/**
 * Генерирует уникальный идентификатор для символа на основе его свойств.
 */
export const makeSymbolId = (filePath: string, symbol: BaseSymbol): string => {
  return createHash('sha256')
    .update(`${filePath}:${symbol.kind}:${symbol.name}:${symbol.startLine}`)
    .digest('hex');
};

/**
 * Удаляет многострочные и однострочные комментарии из исходного кода.
 */
export const removeComments = (rawContent: string): string => {
  return rawContent.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1').trim();
};
