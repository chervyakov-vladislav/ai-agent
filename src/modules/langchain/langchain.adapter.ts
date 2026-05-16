import * as langchainService from './langchain.service';

/**
 * Адаптер для модуля LangChain.
 * На данный момент экспортирует функции сервиса.
 * В будущем может имплементировать специфичные порты приложения.
 */
export const langchainAdapter = {
  splitCodeIntoChunks: langchainService.splitCodeIntoChunks,
};
