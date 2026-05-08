import { cacheRedis } from '../clients/redis-client';
import { logger } from '../logger';

export const saveToRedis = async <T>(key: string, data: T, ttlSeconds = 3600): Promise<void> => {
  try {
    const serializedData = JSON.stringify(data);
    await cacheRedis.set(key, serializedData, 'EX', ttlSeconds);
  } catch (error) {
    logger.error(`[Redis Cache] Error saving key "${key}":`, error);
  }
};

export const getFromRedis = async <T>(key: string): Promise<T | null> => {
  try {
    const data = await cacheRedis.get(key);
    if (!data) return null;

    return JSON.parse(data) as T;
  } catch (error) {
    logger.error(`[Redis Cache] Error reading key "${key}":`, error);
    return null;
  }
};
