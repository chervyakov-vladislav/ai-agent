import { createHash } from 'node:crypto';
import { BaseSymbol } from '@contracts/code-analysis.types';
import { Range } from '@application/contracts/github.types';

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

/**
 * Проверяет, затронута ли AST-нода (функция/класс) изменениями из Diff'а.
 * * @param nodeStart Строка начала функции (напр. node.loc.start.line)
 * @param nodeEnd Строка конца функции (напр. node.loc.end.line)
 * @param changedRanges Диапазоны изменений из гит-диффа
 */
export const isNodeChanged = (
  nodeStart: number,
  nodeEnd: number,
  changedRanges: Range[],
): boolean => {
  return changedRanges.some((range) => {
    return range.start <= nodeEnd && range.end >= nodeStart;
  });
};
