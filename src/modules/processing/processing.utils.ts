import { CodeSymbol, CodeSymbolKind } from './processing.types';

export const findSymbolsInLines = (
  startLine: number,
  endLine: number,
  symbols: CodeSymbol[],
): { name: string; kind: CodeSymbolKind }[] => {
  return symbols
    .filter((s) => startLine <= s.endLine && endLine >= s.startLine)
    .map((s) => ({ name: s.name, kind: s.kind }));
};
