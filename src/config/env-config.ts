import { z } from 'zod';
import { pinoLogger } from '../shared/infrastructure/logger/pino-logger';

const envSchema = z.object({
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('debug'),
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  APP_VERSION: z.string().default('0.0.0'),
  SERVICE_NAME: z.string().default('ai-reviewer'),
  GITHUB_TOKEN: z.string().min(1, 'GITHUB_TOKEN is required'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  RETRY_DELAY: z.coerce.number().default(2000),
  QDRANT_URL: z.url().default('http://localhost:6333'),
  OLLAMA_URL: z.url().default('http://localhost:11434'),
  EMBEDDING_MODEL: z.string().default('nomic-embed-text'),
  QDRANT_COLLECTION_PREFIX: z.string().default('ai-code-index'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  pinoLogger.error('Invalid environment variables:', _env.error.issues);
  process.exit(1);
}

export const envConfig = _env.data;

export type EnvConfig = z.infer<typeof envSchema>;
