import path from 'node:path';
import {
  BaseSymbol,
  CodeSymbol,
  CodeSymbolKind,
  ImportDetails,
  DocumentInput,
  DiffSearchStrategy,
  QdrantChunkPoint,
  ProcessedChunk,
  ChunkMetadata,
  QdrantChunkPayload,
} from '@contracts/code-analysis.types';
import {
  SUPPORTED_JS_EXTENSIONS,
  SUPPORTED_JAVA_EXTENSIONS,
  SUPPORTED_SQL_EXTENSIONS,
} from './ast-parser.constants';
import { tsMorphStrategy } from './strategies/ts-morph/ts-morph.strategy';
import { javaStrategy } from './strategies/java/java.strategy';
import { sqlStrategy } from './strategies/sql/sql.strategy';
import { logger } from '@shared/infrastructure/logger/pino-logger';
import * as astUtils from './ast-parser.utils';

/**
 * Тип для стратегии парсинга.
 */
interface ParserStrategy {
  extractSymbols(filename: string, code: string): BaseSymbol[];
  extractImports(filename: string, code: string): ImportDetails[];
  removeImports(filename: string, code: string): string;
  prepareDocumentInputs(filename: string, content: string, symbols: CodeSymbol[]): DocumentInput[];
  createSkeleton(code: string): string;
}

/**
 * Возвращает подходящую стратегию на основе расширения файла.
 */
const getStrategy = (filename: string): ParserStrategy | null => {
  const ext = path.extname(filename).toLowerCase();

  if (SUPPORTED_JS_EXTENSIONS.has(ext)) {
    return tsMorphStrategy;
  }

  if (SUPPORTED_JAVA_EXTENSIONS.has(ext)) {
    return javaStrategy;
  }

  if (SUPPORTED_SQL_EXTENSIONS.has(ext)) {
    return sqlStrategy;
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

/**
 * Подготавливает входные данные для документов (LangChain) на основе стратегии.
 */
export const prepareDocumentInputs = (
  filename: string,
  content: string,
  symbols: CodeSymbol[],
): DocumentInput[] => {
  const strategy = getStrategy(filename);
  if (!strategy) {
    return [
      {
        pageContent: content,
        metadata: {
          symbolName: filename,
          symbolKind: CodeSymbolKind.FileContent,
          startLine: 0,
          symbolId: 'file-root',
        },
      },
    ];
  }
  return strategy.prepareDocumentInputs(filename, content, symbols);
};

/**
 * Создает скелет кода (интерфейс без реализации).
 */
export const createSkeleton = (filename: string, code: string): string => {
  const strategy = getStrategy(filename);
  return strategy ? strategy.createSkeleton(code) : code;
};

// Утилиты
export const makeSymbolId = astUtils.makeSymbolId;
export const removeComments = astUtils.removeComments;

/**
 * Определяет стратегию поиска в векторной БД на основе характеристик диффа.
 */
export const getSearchStrategy = (params: {
  isNew: boolean;
  isRenamed: boolean;
  extension: string;
  additions: number;
}): DiffSearchStrategy => {
  const { isNew, isRenamed, extension, additions } = params;

  let threshold = 0.75;
  let limit = 4;

  const isDataFile = ['json', 'yaml', 'yml', 'xml', 'md'].includes(extension);
  const isConfig = ['config', 'setup', 'env'].some((kw) => extension.includes(kw));

  if (isDataFile || isConfig) {
    threshold = 0.85;
    limit = 2;
  }

  if (isRenamed) {
    threshold = 0.8;
    limit = 2;
  } else if (isNew) {
    threshold = additions < 20 ? 0.8 : 0.75;
    limit = 3;
  }

  if (extension === 'css' || extension === 'scss') {
    threshold = 0.9;
    limit = 1;
  }

  return { threshold, limit };
};

/**
 * Форматирует импорты для конкретного языка программирования для подачи в LLM.
 */
const formatImportsForLLM = (metadata: ChunkMetadata): string => {
  const { imports, language } = metadata;

  if (!imports || imports.length === 0) return '';

  const formattedLines = imports.map((imp) => {
    if (language === 'java') {
      const staticPrefix = imp.isStatic ? 'static ' : '';
      const wildcardSuffix = imp.isWildcard ? '.*' : '';
      return `import ${staticPrefix}${imp.source}${wildcardSuffix};`;
    }

    const isTSorJS =
      language === 'ts' ||
      language === 'js' ||
      language === 'typescript' ||
      language === 'javascript' ||
      SUPPORTED_JS_EXTENSIONS.has(`.${language}`);

    if (isTSorJS) {
      if (imp.isWildcard) {
        const alias =
          imp.defaultImport || (imp.importedSymbols[0] !== '*' ? imp.importedSymbols[0] : 'module');
        return `import * as ${alias} from '${imp.source}';`;
      }

      const parts: string[] = [];
      if (imp.defaultImport) {
        parts.push(imp.defaultImport);
      }
      if (imp.importedSymbols && imp.importedSymbols.length > 0) {
        parts.push(`{ ${imp.importedSymbols.join(', ')} }`);
      }
      if (parts.length === 0) {
        return `import '${imp.source}';`;
      }
      return `import ${parts.join(', ')} from '${imp.source}';`;
    }

    return `import ${imp.source};`;
  });

  return Array.from(new Set(formattedLines)).join('\n');
};

/**
 * Реконструирует полные фрагменты кода из чанков, полученных из векторной БД.
 * Группирует по parent_id, сортирует по индексу и добавляет контекст (импорты).
 */
export const reconstructChunks = (points: QdrantChunkPoint[]): ProcessedChunk[] => {
  const groups = new Map<string, QdrantChunkPayload[]>();

  for (const point of points) {
    const payload = point.payload;
    if (!payload?.parent_id) continue;
    if (!groups.has(payload.parent_id)) groups.set(payload.parent_id, []);
    groups.get(payload.parent_id)?.push(payload);
  }

  return Array.from(groups.values()).map((parts) => {
    const sortedCode = parts.sort((a, b) => a.partIndex - b.partIndex);
    const meta = sortedCode[0];

    const importsCode = formatImportsForLLM(meta);

    const symbolHeader = meta.symbolHeader?.trim() || '';
    const technicalHeader = meta.technicalHeader || '';
    const rawTextCode = sortedCode.map((part) => part.content).join('\n');

    const fullContent = [technicalHeader, symbolHeader, importsCode, '', rawTextCode]
      .filter(Boolean)
      .join('\n');

    return {
      content: fullContent,
      metadata: { ...meta, hasParts: false },
    };
  });
};
