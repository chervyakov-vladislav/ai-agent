import { findSymbolsInLines, getDetailedSymbols } from './processing.utils';
import { CodeSymbol, CodeSymbolKind, ProcessedChunk } from './processing.types';
import {
  CHUNK_OVERLAP,
  CHUNK_SIZE,
  LANGCHAIN_LANGUAGE_MAP,
  SUPPORTED_JS_EXTENSIONS,
} from './processing.constants';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

export const processFile = async (
  filename: string,
  content: string,
  fileHash: string,
  extension: string,
): Promise<ProcessedChunk[]> => {
  const language = extension.replace('.', '') || 'unknown';
  let foundSymbols: CodeSymbol[] = [];

  if (SUPPORTED_JS_EXTENSIONS.has(extension)) {
    foundSymbols = getDetailedSymbols(filename, content);
  }

  const lcLang = LANGCHAIN_LANGUAGE_MAP[extension];
  const splitter = lcLang
    ? RecursiveCharacterTextSplitter.fromLanguage(lcLang, {
        chunkSize: CHUNK_SIZE,
        chunkOverlap: CHUNK_OVERLAP,
      })
    : new RecursiveCharacterTextSplitter({ chunkSize: CHUNK_SIZE, chunkOverlap: CHUNK_OVERLAP });

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

    return {
      content: `File: ${filename}${partSuffix}\n${symbolsHeader}\n---\n${doc.pageContent}`,
      metadata: {
        filename,
        fileHash,
        language,
        startLine,
        endLine,
        symbolName: symbolsInChunk.map((s) => s.name).join(', ') || undefined,
        symbolKind:
          symbolsInChunk.length === 1
            ? (symbolsInChunk[0].kind as CodeSymbolKind)
            : CodeSymbolKind.FileContent,
      },
    };
  });
};
