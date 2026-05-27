import { createHash } from 'node:crypto';
import { cacheRedis } from '@shared/infrastructure/clients/redis-client';
import { logger } from '@shared/infrastructure/logger';

const saveToRedis = async <T>(key: string, data: T, ttlSeconds = 3600): Promise<void> => {
  try {
    const serializedData = JSON.stringify(data);
    await cacheRedis.set(key, serializedData, 'EX', ttlSeconds);
  } catch (error) {
    logger.error(`[Redis Cache] Error saving key "${key}":`, error);
  }
};

const getFromRedis = async <T = unknown>(key: string): Promise<T | null> => {
  try {
    const data = await cacheRedis.get(key);
    if (!data) return null;

    return JSON.parse(data) as T;
  } catch (error) {
    logger.error(`[Redis Cache] Error reading key "${key}":`, error);
    return null;
  }
};

const getEmbeddingCacheKey = (text: string): string => {
  const hash = createHash('sha256').update(text).digest('hex');

  return `embedding:${hash}`;
};

/**
 * Получает вектор из кэша
 */
export const getEmbeddingFromCache = async (text: string): Promise<number[] | null> => {
  const key = getEmbeddingCacheKey(text);

  return await getFromRedis<number[]>(key);
};

/**
 * Сохраняет вектор в кэш (по умолчанию на 4 дня)
 */
export const saveEmbeddingToCache = async (text: string, vector: number[]): Promise<void> => {
  const key = getEmbeddingCacheKey(text);

  // 4 дня * 24 часа * 60 минут * 60 секунд = 345600
  await saveToRedis(key, vector, 345600);
};
