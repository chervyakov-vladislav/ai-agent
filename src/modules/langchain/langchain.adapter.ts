import { LangChainProcessingPort } from '@application/pipelines/code-processing/processing.contracts';
import { CodeSplitterSearchQueryPort } from '@application/use-cases/analyze-pr/analyze-pr.ports';
import * as langchainService from './langchain.service';

/**
 * Адаптер модуля LangChain для индексации кодовой базы.
 */
export const langchainIndexAdapter: LangChainProcessingPort = {
  splitCodeIntoChunks: langchainService.splitCodeIntoChunks,
};

export const langchainSearchQueryAdapter: CodeSplitterSearchQueryPort = {
  splitSearchQuery: langchainService.splitSearchQuery,
};
