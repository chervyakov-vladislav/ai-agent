import { analyzeRawContent } from 'modules/code-indexing-processing/analyzer/file-analyzer';
import { splitCodeIntoChunks } from 'modules/code-indexing-processing/splitters/code-splitter';
import { createProcessFilePipeline } from '@application/pipelines/code-processing/processing.pipeline';

export const processFilePipeline = createProcessFilePipeline(
  analyzeRawContent,
  splitCodeIntoChunks,
);
