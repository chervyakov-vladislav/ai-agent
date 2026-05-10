export enum CodeSymbolKind {
  Class = 'class',
  Function = 'function',
  Interface = 'interface',
  Type = 'type',
  Enum = 'enum',
  Method = 'method',
  ConstFunc = 'const-func',
  FileContent = 'file-content',
  Table = 'table',
  Index = 'index',
  View = 'view',
  Modification = 'modification',
  Transaction = 'transaction',
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
  symbolKind: CodeSymbolKind[];
  symbolName?: string[];
  startLine?: number;
  endLine?: number;
  language?: string;
  imports: string;
}

export interface ProcessedChunk {
  content: string;
  metadata: ChunkMetadata;
}
