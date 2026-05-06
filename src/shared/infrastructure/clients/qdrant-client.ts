import { QdrantClient } from '@qdrant/js-client-rest';
import { envConfig } from '@config/env-config';

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
  } finally {
    clearTimeout(id);
  }
};
