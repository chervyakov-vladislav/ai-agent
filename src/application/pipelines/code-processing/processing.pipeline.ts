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
    // 1. Извлекаем символы (классы, функции и т.д.)
    const baseSymbols = astParser.extractSymbols(filename, rawContent);

    // 2. Сортируем и генерируем уникальные ID для символов
    const symbols: CodeSymbol[] = baseSymbols
      .sort((a, b) => a.startLine - b.startLine)
      .map((s) => ({
        ...s,
        symbol_id: astParser.makeSymbolId(filename, s),
      }));

    // 3. Извлекаем импорты
    const imports = astParser.extractImports(filename, rawContent);

    // 4. Подготавливаем входные данные для документов (очистка от импортов, группировка по символам)
    const documentInputs = astParser.prepareDocumentInputs(filename, rawContent, symbols);

    // 5. Разрезаем документы на чанки с помощью LangChain
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
