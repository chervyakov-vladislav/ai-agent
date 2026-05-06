import { QdrantClient } from '@qdrant/js-client-rest';
import { envConfig } from '@config/env-config';
import { DatabaseConnectionError, DatabaseTimeoutError } from '@shared/errors/DatabaseErrors';
import { AppError } from '@shared/errors/AppError';

export const qdrantClient = new QdrantClient({
  url: envConfig.QDRANT_URL,
});

export const pingQdrantApi = async (timeoutMs: number): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${envConfig.QDRANT_URL}/collections`, {
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new DatabaseTimeoutError(`Qdrant ping timed out after ${timeoutMs}ms`);
    }
    if (error instanceof AppError) throw error;

    throw new DatabaseConnectionError('Qdrant connection failed');
  } finally {
    clearTimeout(id);
  }
};
