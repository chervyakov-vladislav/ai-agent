import { SplitResult, CodeSymbol } from '@contracts/code-analysis.types';
import { AstParserPort, LangChainPort, CodeProcessingPipeline } from './processing.contracts';

/**
 * Создает пайплайн обработки файлов, оркеструя работу AST-парсера и LangChain.
 */
export const createProcessFilePipeline = (
  astParser: AstParserPort,
  langchain: LangChainPort,
): CodeProcessingPipeline => {
  return async (
    filename: string,
    rawContent: string,
    fileHash: string,
    extension: string,
  ): Promise<SplitResult> => {
    const baseSymbols = astParser.extractSymbols(filename, rawContent);

    const symbols: CodeSymbol[] = baseSymbols
      .sort((a, b) => a.startLine - b.startLine)
      .map((s) => ({
        ...s,
        symbol_id: astParser.makeSymbolId(filename, s),
      }));

    const imports = astParser.extractImports(filename, rawContent);

    const documentInputs = astParser.prepareDocumentInputs(filename, rawContent, symbols);

    const splitCode = await langchain.splitCodeIntoChunks({
      filename,
      fileHash,
      extension,
      symbols,
      imports,
      documentInputs,
    });

    return splitCode;
  };
};
