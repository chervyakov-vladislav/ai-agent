import {
  SplitResult,
  DocumentInput,
  CodeSymbol,
  ImportDetails,
} from '@contracts/code-analysis.types';

export type CodeProcessingPipeline = (
  filename: string,
  rawContent: string,
  fileHash: string,
  extension: string,
) => Promise<SplitResult>;

export interface AstParserPort {
  extractSymbols(filename: string, content: string): any[]; // BaseSymbol[]
  makeSymbolId(filename: string, symbol: any): string;
  extractImports(filename: string, content: string): ImportDetails[];
  prepareDocumentInputs(filename: string, content: string, symbols: CodeSymbol[]): DocumentInput[];
}

export interface LangChainPort {
  splitCodeIntoChunks(params: {
    filename: string;
    fileHash: string;
    extension: string;
    symbols: CodeSymbol[];
    imports: ImportDetails[];
    documentInputs: DocumentInput[];
  }): Promise<SplitResult>;
}
