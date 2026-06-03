import { logger } from '@shared/infrastructure/logger/pino-logger';
import { initAnalysisWorker } from './analysis.worker';
import { initIndexingWorker } from './indexing.worker';

/**
 * Инициализирует и запускает все воркеры BullMQ.
 */
export const initWorkers = () => {
  try {
    logger.info('[Workers] Initializing background workers...');

    const analysisWorker = initAnalysisWorker();
    const indexingWorker = initIndexingWorker();

    logger.info('[Workers] All workers started successfully');

    return {
      analysisWorker,
      indexingWorker,
    };
  } catch (error) {
    logger.error('[Workers] Failed to initialize workers', error);
    throw error;
  }
};
