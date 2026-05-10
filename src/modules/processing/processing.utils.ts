import { CodeSymbol, CodeSymbolKind } from '@application/contracts/code-analysis.types';
import { SUPPORTED_JS_EXTENSIONS } from './processing.constants';

export const findSymbolsInLines = (
  startLine: number,
  endLine: number,
  symbols: CodeSymbol[],
): { name: string; kind: CodeSymbolKind }[] => {
  return symbols
    .filter((s) => startLine <= s.endLine && endLine >= s.startLine)
    .map((s) => ({ name: s.name, kind: s.kind }));
};

export const extractImports = (content: string, extension: string): string[] => {
  const imports: string[] = [];

  if (SUPPORTED_JS_EXTENSIONS.has(extension)) {
    const esmRegex = /from\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = esmRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
  }

  if (extension === '.java') {
    const javaRegex = /import\s+([\w.]+);/g;
    let match;

    while ((match = javaRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
  }

  return imports;
};
