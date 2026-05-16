import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';
import {
  ProcessedChunk,
  CodeSymbol,
  ImportDetails,
  SplitResult,
  DocumentInput,
} from '@contracts/code-analysis.types';
import { SPLITTER_CONFIGS } from './langchain.constants';

interface SplitParams {
  filename: string;
  fileHash: string;
  extension: string;
  symbols: CodeSymbol[];
  imports: ImportDetails[];
  documentInputs: DocumentInput[];
}

/**
 * Сервис для работы с LangChain: разбиение кода на чанки.
 */
export const splitCodeIntoChunks = async ({
  filename,
  fileHash,
  extension,
  symbols,
  imports,
  documentInputs,
}: SplitParams): Promise<SplitResult> => {
  const language = extension.replace('.', '') || 'unknown';

  const smallSplitter = new RecursiveCharacterTextSplitter(SPLITTER_CONFIGS.nomic);
  const largeSplitter = new RecursiveCharacterTextSplitter(SPLITTER_CONFIGS.fullDocument);

  const smallChunks: ProcessedChunk[] = [];
  const largeChunks: ProcessedChunk[] = [];

  const docs = documentInputs.map((input) => new Document(input));

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
      const technicalHeader = `File: ${filename}\n${symbolHeader}\n---`;
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
          symbolName,
          symbolKind,
          allSymbolsInFile: symbols.map((s) => `${s.kind}:${s.name}`),
          importsText: imports.map((imp) => imp.source),
          imports,
        },
      });
    }

    for (const [idx, parentDoc] of largeDocs.entries()) {
      const symbolHeader = hasSymbols ? `Symbols: ${symbolKind} ${symbolName}\n` : '';
      const technicalHeader = `File: ${filename}\n${symbolHeader}\n---`;
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
          symbolName,
          symbolKind,
          allSymbolsInFile: symbols.map((s) => `${s.kind}:${s.name}`),
          importsText: imports.map((imp) => imp.source),
          imports,
        },
      });
    }
  }

  return { smallChunks, largeChunks };
};
