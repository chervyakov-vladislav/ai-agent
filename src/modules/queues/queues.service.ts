import { Queue, JobsOptions } from 'bullmq';
import { queueRedis, cacheRedis } from '@shared/infrastructure/clients/redis-client';
import { logger } from '@shared/infrastructure/logger/pino-logger';
import { QUEUE_NAMES, JobPriority, JOB_NAMES } from './queues.constants';
import { IndexingPayload, AnalysisPayload } from '@application/contracts/queues.types';

export const analysisQueue = new Queue(QUEUE_NAMES.ANALYSIS, {
  connection: queueRedis,
  defaultJobOptions: {
    attempts: 100,
    backoff: { type: 'fixed', delay: 10000 },
    removeOnComplete: true,
  },
});

export const indexingQueue = new Queue(QUEUE_NAMES.INDEXING, {
  connection: queueRedis,
  defaultJobOptions: {
    attempts: 100,
    backoff: { type: 'fixed', delay: 15000 }, // Чуть реже для фоновой индексации
    removeOnComplete: true,
  },
});

/**
 * Ключ блокировки для репозитория.
 */
const getRepoLockKey = (repoId: string) => `lock:repo:${repoId}`;

/**
 * Пытается захватить блокировку для репозитория.
 * @returns true если блокировка захвачена, false если уже занято.
 */
export const acquireRepoLock = async (
  repoId: string,
  jobId: string,
  ttl = 600,
): Promise<boolean> => {
  const key = getRepoLockKey(repoId);
  const result = await cacheRedis.set(key, jobId, 'EX', ttl, 'NX');
  return result === 'OK';
};

/**
 * Освобождает блокировку репозитория (атомарно через Lua).
 */
export const releaseRepoLock = async (repoId: string, jobId: string): Promise<void> => {
  const key = getRepoLockKey(repoId);

  // Lua-скрипт для защиты от удаления чужих блокировок
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;

  try {
    // В ioredis eval принимает script, количество ключей, затем ключи и аргументы
    await cacheRedis.eval(script, 1, key, jobId);
  } catch (error) {
    logger.error(`[Redis] Failed to release lock for ${repoId}`, error);
  }
};

/**
 * Низкоуровневая обертка для добавления задачи в очередь.
 */
export const addJobToQueue = async <T extends object>(
  queue: Queue,
  taskName: string,
  payload: T,
  options?: JobsOptions,
): Promise<string> => {
  try {
    const job = await queue.add(taskName, payload, options);

    if (!job.id) {
      throw new Error(`[BullMQ] Failed to get job ID for ${taskName} in ${queue.name}`);
    }

    logger.debug(`[BullMQ] Added job ${job.id} to ${queue.name} (${taskName})`);
    return job.id;
  } catch (error) {
    logger.error(`[BullMQ] Error adding job to ${queue.name}`, error);
    throw error;
  }
};

/**
 * Отправляет задачу на индексацию кодовой базы.
 */
export const dispatchIndexing = async (payload: IndexingPayload): Promise<string> => {
  const jobId = `index:${payload.repoId}:${payload.commitHash}`;

  return addJobToQueue(indexingQueue, JOB_NAMES.INDEX_CODEBASE, payload, {
    priority: JobPriority.LOW,
    jobId,
  });
};

/**
 * Отправляет задачу на анализ PR.
 */
export const dispatchAnalysis = async (payload: AnalysisPayload): Promise<string> => {
  const jobId = `analyze:${payload.repoId}:${payload.prId}:${Date.now()}`;

  return addJobToQueue(analysisQueue, JOB_NAMES.ANALYZE_PR, payload, {
    priority: JobPriority.HIGH,
    jobId,
  });
};
