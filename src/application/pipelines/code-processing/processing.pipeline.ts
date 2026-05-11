import { SplitResult } from '@contracts/code-analysis.types';
import { CodeAnalyzerFn, CodeSplitterFn } from './processing.contracts';

export const createProcessFile = (analyze: CodeAnalyzerFn, split: CodeSplitterFn) => {
  return async (
    filename: string,
    rawContent: string,
    fileHash: string,
    extension: string,
  ): Promise<SplitResult> => {
    const { cleanedContent: content, imports, symbols } = analyze(rawContent, filename, extension);

    const splitCode = await split({
      filename,
      content,
      fileHash,
      extension,
      symbols,
      imports,
    });

    return splitCode;
  };
};
