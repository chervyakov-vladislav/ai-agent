import { analyzeRawContent } from 'modules/code-processing/analyzer/file-analyzer';
import { splitCodeIntoChunks } from '@modules/code-processing/splitters/code-splitter';
import { createProcessFile } from '@application/pipelines/code-processing/processing.pipeline';

export const processFile = createProcessFile(analyzeRawContent, splitCodeIntoChunks);
