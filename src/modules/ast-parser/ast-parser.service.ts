import path from 'node:path';
import { BaseSymbol, ImportDetails } from '@contracts/code-analysis.types';
import { SUPPORTED_JS_EXTENSIONS } from './ast-parser.constants';
import { tsMorphStrategy } from './strategies/ts-morph/ts-morph.strategy';
import { logger } from '@shared/infrastructure/logger/pino-logger';

/**
 * Тип для стратегии парсинга.
 */
interface ParserStrategy {
  extractSymbols(filename: string, code: string): BaseSymbol[];
  extractImports(filename: string, code: string): ImportDetails[];
  removeImports(filename: string, code: string): string;
}

/**
 * Возвращает подходящую стратегию на основе расширения файла.
 */
const getStrategy = (filename: string): ParserStrategy | null => {
  const ext = path.extname(filename).toLowerCase();

  if (SUPPORTED_JS_EXTENSIONS.has(ext)) {
    return tsMorphStrategy;
  }

  logger.warn(`No AST strategy found for extension: ${ext}`);
  return null;
};

/**
 * Сервис-оркестратор для выбора стратегии AST парсинга.
 */
export const extractSymbols = (filename: string, code: string): BaseSymbol[] => {
  const strategy = getStrategy(filename);
  return strategy ? strategy.extractSymbols(filename, code) : [];
};

export const extractImports = (filename: string, code: string): ImportDetails[] => {
  const strategy = getStrategy(filename);
  return strategy ? strategy.extractImports(filename, code) : [];
};

export const removeImports = (filename: string, code: string): string => {
  const strategy = getStrategy(filename);
  return strategy ? strategy.removeImports(filename, code) : code;
};
