import { BaseSymbol, CodeSymbol, ImportDetails } from '@contracts/code-analysis.types';
import { SUPPORTED_JS_EXTENSIONS } from '@modules/code-indexing-processing/code-indexing-processing.constants';
import { getJsSymbols } from '@modules/code-indexing-processing/analyzer/extractors/typescript.extractor';
import { getJavaSymbols } from '@modules/code-indexing-processing/analyzer/extractors/java.extractor';
import { getSqlSymbols } from '@modules/code-indexing-processing/analyzer/extractors/sql.extractor';
import { extractImports } from './extractors/import-extractor';
import { removeComments } from '@modules/code-indexing-processing/code-indexing-processing.utils';
import { makeSymbolId } from '@modules/code-indexing-processing/code-indexing-processing.utils';

interface FileAnalysis {
  symbols: CodeSymbol[];
  imports: ImportDetails[];
  cleanedContent: string;
}

// улучшить анализ через symbol graph(CALLS / IMPORTS)
export const analyzeRawContent = (
  rawContent: string,
  filename: string,
  extension: string,
): FileAnalysis => {
  let foundSymbols: BaseSymbol[] = [];
  const imports = extractImports(rawContent, extension);
  const content = removeComments(rawContent);

  if (SUPPORTED_JS_EXTENSIONS.has(extension)) {
    foundSymbols = getJsSymbols(filename, content);
  }

  if (extension === '.java') {
    foundSymbols = getJavaSymbols(content);
  }

  if (extension === '.sql') {
    foundSymbols = getSqlSymbols(content);
  }

  const sortedSymbols = [...foundSymbols]
    .sort((a, b) => a.startLine - b.startLine)
    .map((symbol) => ({
      ...symbol,
      symbol_id: makeSymbolId(filename, symbol),
    }));

  return {
    symbols: sortedSymbols,
    imports,
    cleanedContent: content,
  };
};
