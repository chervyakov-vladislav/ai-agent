import { astParserIndexingAdapter } from '@modules/ast-parser/ast-parser.adapter';
import { langchainAdapter } from '@modules/langchain/langchain.adapter';
import { createProcessFilePipeline } from '@application/pipelines/code-processing/processing.pipeline';

/**
 * Контейнер для внедрения зависимостей в пайплайн обработки файлов.
 */
export const processFilePipeline = createProcessFilePipeline(
  astParserIndexingAdapter,
  langchainAdapter,
);
