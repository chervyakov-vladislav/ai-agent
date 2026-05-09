import * as processingService from './processing.service';

export const processingModule = {
  processFile: processingService.processFile,
};

export type ProcessingModule = typeof processingModule;
