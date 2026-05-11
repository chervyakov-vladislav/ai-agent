import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import {
  ProcessedChunk,
  CodeSymbol,
  ImportDetails,
  SplitResult,
} from '@contracts/code-analysis.types';
import { SPLITTER_CONFIGS, SUPPORTED_JS_EXTENSIONS } from '../processing.constants';
import { Document } from '@langchain/core/documents';
import { removeJsImports } from './remove-js-imports';

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
          const codeLines = content.split('\n').slice(symbol.startLine, symbol.endLine);
          let codeBlock = codeLines.join('\n');

          if (SUPPORTED_JS_EXTENSIONS.has(extension)) {
            codeBlock = removeJsImports(codeBlock, extension);
          }

          const header = `${symbol.kind}: ${symbol.name}`;
          const importsLine = imports.length
            ? `Imports: ${imports.map((imp) => imp.source).join(', ')}`
            : '';
          const docContent = `${header}\n${codeBlock}\n${importsLine}`;

          return new Document({
            pageContent: docContent,
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
      smallChunks.push({
        content: `File: ${filename}\n${hasSymbols ? `Symbols: ${symbolKind} ${symbolName}\n` : ''}---\n${childDoc.pageContent}`,
        metadata: {
          id: `${baseId}:child:${idx}`,
          parent_id: baseId,
          chunkType: 'small',
          filename,
          fileHash,
          language,
          symbolId,
          startLine,
          hasParts: smallChunks.length > 1,
          partIndex: idx,
          symbols: `${symbolKind}:${symbolName}`,
          symbolName,
          symbolKind,
          importsText: imports.map((imp) => imp.source),
          imports,
        },
      });
    }

    for (const [idx, parentDoc] of largeDocs.entries()) {
      const hasParts = largeDocs.length > 1;
      const partText = `:(part ${idx}/${largeDocs.length}`;

      largeChunks.push({
        content: `File: ${filename}${hasParts ? partText : ''}\n${hasSymbols ? `Symbols: ${symbolKind} ${symbolName}\n` : ''}---\n${parentDoc.pageContent}`,
        metadata: {
          id: baseId,
          parent_id: baseId,
          chunkType: 'large',
          filename,
          fileHash,
          hasParts,
          partIndex: idx,
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
