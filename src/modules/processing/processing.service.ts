import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { getJsSymbols } from './extractors/typescript.extractor';
import { getJavaSymbols } from './extractors/java.extractor';
import { getSqlSymbols } from './extractors/sql.extractor';
import { CodeSymbol, CodeSymbolKind, ProcessedChunk } from './processing.types';
import {
  LANGCHAIN_LANGUAGE_MAP,
  SPLITTER_CONFIGS,
  SUPPORTED_CONFIG_EXTENSIONS,
  SUPPORTED_JS_EXTENSIONS,
} from './processing.constants';
import { extractImports, findSymbolsInLines } from './processing.utils';

export const processFile = async (
  filename: string,
  content: string,
  fileHash: string,
  extension: string,
): Promise<ProcessedChunk[]> => {
  const language = extension.replace('.', '') || 'unknown';
  let foundSymbols: CodeSymbol[] = [];
  // реализовать анализ импортов при поиске
  const imports = extractImports(content, extension);

  if (SUPPORTED_JS_EXTENSIONS.has(extension)) {
    foundSymbols = getJsSymbols(filename, content);
  }

  if (extension === '.java') {
    foundSymbols = getJavaSymbols(content);
  }

  if (extension === '.sql') {
    foundSymbols = getSqlSymbols(content);
  }

  const getSplitterConfig = (extension: string, isSpecial: boolean) => {
    if (SUPPORTED_CONFIG_EXTENSIONS.has(extension)) return SPLITTER_CONFIGS.config;

    return isSpecial ? SPLITTER_CONFIGS.fullDocument : SPLITTER_CONFIGS.nomic;
  };

  const sortedSymbols = [...foundSymbols].sort((a, b) => a.startLine - b.startLine);
  const lcLang = LANGCHAIN_LANGUAGE_MAP[extension];
  const isSpecialCase = Boolean(lcLang && sortedSymbols.length);
  const config = getSplitterConfig(extension, isSpecialCase);

  // реализовать ParentDocumentRetriever. разделить код на 2 коллекции с маленькими чанками и с большими родительскими. что бы они ссылались друг на друга
  const splitter = lcLang
    ? RecursiveCharacterTextSplitter.fromLanguage(lcLang, config)
    : new RecursiveCharacterTextSplitter(config);

  const docs = await splitter.createDocuments([content]);
  let searchOffset = 0;

  return docs.map((doc, index) => {
    const chunkStartIndex = content.indexOf(doc.pageContent, searchOffset);
    if (chunkStartIndex !== -1) {
      searchOffset = chunkStartIndex + 1;
    }
    const startLine = content.slice(0, chunkStartIndex).split('\n').length;
    const chunkLinesCount = doc.pageContent.split('\n').length;
    const endLine = startLine + chunkLinesCount - 1;

    const symbolsInChunk = findSymbolsInLines(startLine, endLine, foundSymbols);

    const symbolsHeader =
      symbolsInChunk.length > 0
        ? `Symbols: ${symbolsInChunk.map((s) => `${s.kind} ${s.name}`).join(', ')}`
        : 'Generic Code';

    const partSuffix = docs.length > 1 ? ` (part ${index + 1}/${docs.length})` : '';
    const allKinds = [...new Set(symbolsInChunk.map((s) => s.kind))];

    return {
      content: `File: ${filename}${partSuffix}\n${symbolsHeader}\n---\n${doc.pageContent}`,
      metadata: {
        filename,
        fileHash,
        language,
        startLine,
        endLine,
        symbols: symbolsInChunk.map((s) => `${s.kind}:${s.name}`),
        symbolName: symbolsInChunk.map((s) => s.name),
        symbolKind: allKinds.length > 0 ? allKinds : [CodeSymbolKind.FileContent],
        imports: imports.join(','),
      },
    };
  });
};
