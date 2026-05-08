export type CodeSymbolKind = 'class' | 'function' | 'interface' | 'type' | 'method' | 'const-func';

export interface CodeSymbol {
  name: string;
  kind: CodeSymbolKind;
  startLine: number;
  endLine: number;
}
