import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import {
  ProcessedChunk,
  CodeSymbol,
  ImportDetails,
  SplitResult,
} from '@contracts/code-analysis.types';
import { SPLITTER_CONFIGS, SUPPORTED_JS_EXTENSIONS } from '../code-indexing-processing.constants';
import { Document } from '@langchain/core/documents';
import { removeJsImports } from './remove-js-imports';
import { removeJavaImports } from './remove-java-imports';

interface SplitParams {
  filename: string;
  content: string;
  fileHash: string;
  extension: string;
  symbols: CodeSymbol[];
  imports: ImportDetails[];
}

export const splitCodeIntoChunks = async ({
  filename,
  content,
  fileHash,
  extension,
  symbols,
  imports,
}: SplitParams): Promise<SplitResult> => {
  const language = extension.replace('.', '') || 'unknown';

  const smallSplitter = new RecursiveCharacterTextSplitter(SPLITTER_CONFIGS.nomic);
  const largeSplitter = new RecursiveCharacterTextSplitter(SPLITTER_CONFIGS.fullDocument);

  const smallChunks: ProcessedChunk[] = [];
  const largeChunks: ProcessedChunk[] = [];

  const docs: Document[] =
    symbols.length > 0
      ? symbols.map((symbol) => {
          const startLine = symbol.startLine > 0 ? symbol.startLine - 1 : 0;
          const codeLines = content.split('\n').slice(startLine, symbol.endLine);
          let codeBlock = codeLines.join('\n');

          if (SUPPORTED_JS_EXTENSIONS.has(extension)) {
            codeBlock = removeJsImports(codeBlock, extension);
          }

          if (extension === '.java') {
            codeBlock = removeJavaImports(codeBlock);
          }

          return new Document({
            pageContent: codeBlock,
            metadata: {
              symbolName: symbol.name,
              symbolKind: symbol.kind,
              startLine: symbol.startLine,
              symbolId: symbol.symbol_id,
            },
          });
        })
      : [
          new Document({
            pageContent: content,
            metadata: {
              symbolName: filename,
              symbolKind: 'FileContent',
              startLine: 0,
              symbolId: 'file-root',
            },
          }),
        ];

  for (const doc of docs) {
    const { symbolKind, symbolName, startLine, symbolId } = doc.metadata;
    const baseId = `${fileHash}:${symbolKind}:${symbolName}:${startLine}`;
    const hasSymbols = symbolId !== 'file-root';

    const [smallDocs, largeDocs] = await Promise.all([
      smallSplitter.splitDocuments([doc]),
      largeSplitter.splitDocuments([doc]),
    ]);

    for (const [idx, childDoc] of smallDocs.entries()) {
      const symbolHeader = hasSymbols ? `Symbols: ${symbolKind} ${symbolName}\n` : '';
      const importsSummary = imports.length
        ? `Imports: ${imports.map((imp) => imp.source).join(', ')}`
        : '';
      const technicalHeader = `File: ${filename}\n${symbolHeader}\n${importsSummary}\n---`;
      const chunkContent = `${technicalHeader}\n${childDoc.pageContent}`;

      smallChunks.push({
        content: chunkContent,
        metadata: {
          id: `${baseId}:small:${idx}`,
          parent_id: baseId,
          chunkType: 'small',
          filename,
          fileHash,
          language,
          symbolId,
          startLine,
          hasParts: smallDocs.length > 1,
          partIndex: idx,
          partCount: smallDocs.length,
          symbols: `${symbolKind}:${symbolName}`,
          symbolName,
          symbolKind,
          importsText: imports.map((imp) => imp.source),
          imports,
        },
      });
    }

    for (const [idx, parentDoc] of largeDocs.entries()) {
      const symbolHeader = hasSymbols ? `Symbols: ${symbolKind} ${symbolName}\n` : '';
      const importsSummary = imports.length
        ? `Imports: ${imports.map((imp) => imp.source).join(', ')}`
        : '';
      const technicalHeader = `File: ${filename}\n${symbolHeader}\n${importsSummary}\n---`;
      const chunkContent = `${technicalHeader}\n${parentDoc.pageContent}`;

      largeChunks.push({
        content: chunkContent,
        metadata: {
          id: `${baseId}:large:${idx}`,
          parent_id: baseId,
          chunkType: 'large',
          filename,
          fileHash,
          hasParts: largeDocs.length > 1,
          partIndex: idx,
          partCount: largeDocs.length,
          language,
          symbolId,
          startLine,
          symbols: `${symbolKind}:${symbolName}`,
          symbolName,
          symbolKind,
          importsText: imports.map((imp) => imp.source),
          imports,
        },
      });
    }
  }

  return { smallChunks, largeChunks };
};
