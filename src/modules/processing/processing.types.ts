export enum CodeSymbolKind {
  Class = 'class',
  Function = 'function',
  Interface = 'interface',
  Type = 'type',
  Method = 'method',
  ConstFunc = 'const-func',
  FileContent = 'file-content',
}

export interface CodeSymbol {
  name: string;
  kind: CodeSymbolKind;
  startLine: number;
  endLine: number;
}

export interface ChunkMetadata {
  filename: string;
  fileHash: string;
  symbolKind: CodeSymbolKind;
  symbolName?: string;
  startLine?: number;
  endLine?: number;
  language?: string;
}

export interface ProcessedChunk {
  content: string;
  metadata: ChunkMetadata;
}
