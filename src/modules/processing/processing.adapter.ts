import * as processingService from './processing.service';

export const processingAdapter = {
  processFile: processingService.processFile,
};

export type ProcessingAdapter = typeof processingAdapter;
