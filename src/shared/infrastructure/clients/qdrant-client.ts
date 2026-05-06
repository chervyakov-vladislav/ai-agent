import { QdrantClient } from '@qdrant/js-client-rest';
import { envConfig } from '@config/env-config';

export const qdrantClient = new QdrantClient({
  url: envConfig.QDRANT_URL,
});
