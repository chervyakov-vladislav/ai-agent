export enum CodeSymbolKind {
  Class = 'class',
  Function = 'function',
  Interface = 'interface',
  Type = 'type',
  Enum = 'enum',
  Method = 'method',
  ConstFunc = 'const-func',
  Variable = 'variable',
  FileContent = 'file-content',
  Table = 'table',
  Index = 'index',
  View = 'view',
  Modification = 'modification',
  Transaction = 'transaction',
  Unknown = 'Unknown',
}

export type BaseSymbol = Omit<CodeSymbol, 'symbol_id'>;

export interface CodeSymbol {
  symbol_id: string;
  name: string;
  kind: CodeSymbolKind;
  startLine: number;
  endLine: number;
}

export interface ChunkMetadata {
  id: string;
  parent_id: string;
  chunkType: 'small' | 'large';
  filename: string;
  fileHash: string;
  hasParts: boolean;
  partIndex: number;
  partCount: number;
  symbolId: string;
  symbolKind: CodeSymbolKind;
  symbolName?: string;
  allSymbolsInFile: string[];
  startLine?: number;
  language?: string;
  imports: ImportDetails[];
  importsText: string[];
  technicalHeader?: string;
  symbolHeader?: string;
}

export interface ProcessedChunk {
  content: string;
  metadata: ChunkMetadata;
}

export interface Embedding extends ProcessedChunk {
  embedding: number[];
}

export interface ImportDetails {
  source: string;
  defaultImport?: string;
  importedSymbols: string[];
  type?: 'static' | 'normal';
  isWildcard?: boolean;
  isStatic?: boolean;
}

export interface SplitResult {
  smallChunks: ProcessedChunk[];
  largeChunks: ProcessedChunk[];
}

export interface DiffSearchStrategy {
  threshold: number;
  limit: number;
}

export type QdrantChunkPayload = ChunkMetadata & {
  content: string;
};

export interface QdrantChunkPoint {
  id: string | number;
  payload: QdrantChunkPayload;
  vector?: number[] | Record<string, number[]>;
  score?: number;
  shard_key?: string;
}

export interface DocumentInput {
  pageContent: string;
  metadata: {
    symbolName: string;
    symbolKind: CodeSymbolKind;
    startLine: number;
    symbolId: string;
  };
}
