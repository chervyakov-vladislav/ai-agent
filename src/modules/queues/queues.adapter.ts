import { QueueOrchestratorPort } from '@application/ports/queue-orchestrator.port';
import * as service from './queues.service';

/**
 * Адаптер для управления очередями задач.
 * Реализует порт приложения для оркестрации задач индексации и анализа.
 */
export const queuesAdapter: QueueOrchestratorPort = {
  dispatchIndexing: service.dispatchIndexing,
  dispatchAnalysis: service.dispatchAnalysis,
};

/**
 * Адаптер для воркеров (управление блокировками).
 * Эти методы будут использоваться в обработчиках задач для обеспечения взаимоисключения.
 */
export const queueLockAdapter = {
  acquireRepoLock: service.acquireRepoLock,
  releaseRepoLock: service.releaseRepoLock,
};
