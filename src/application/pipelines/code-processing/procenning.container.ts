import { analyzeRawContent } from 'modules/code-processing/analyzer/file-analyzer';
import { splitCodeIntoChunks } from '@modules/code-processing/splitters/code-splitter';
import { createProcessFilePipeline } from '@application/pipelines/code-processing/processing.pipeline';

export const processFilePipeline = createProcessFilePipeline(
  analyzeRawContent,
  splitCodeIntoChunks,
);
