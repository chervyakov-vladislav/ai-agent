import { CodeSymbol, ImportDetails, SplitResult } from '@contracts/code-analysis.types';

export interface CodeAnalysisResult {
  symbols: CodeSymbol[];
  imports: ImportDetails[];
  cleanedContent: string;
}

export type CodeAnalyzerFn = (
  content: string,
  filename: string,
  extension: string,
) => CodeAnalysisResult;

export type CodeSplitterFn = (params: {
  filename: string;
  content: string;
  fileHash: string;
  extension: string;
  symbols: CodeSymbol[];
  imports: ImportDetails[];
}) => Promise<SplitResult>;
