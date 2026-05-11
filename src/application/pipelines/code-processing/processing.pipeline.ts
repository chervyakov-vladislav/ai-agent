import { SplitResult } from '@contracts/code-analysis.types';
import { analyzeRawContent } from './analyzers';
import { splitCodeIntoChunks } from './chunking/code-splitter';

export const processFile = async (
  filename: string,
  rawContent: string,
  fileHash: string,
  extension: string,
): Promise<SplitResult> => {
  const {
    cleanedContent: content,
    imports,
    symbols,
  } = analyzeRawContent(rawContent, filename, extension);

  const splitCode = await splitCodeIntoChunks({
    filename,
    content,
    fileHash,
    extension,
    symbols,
    imports,
  });

  return splitCode;
};
