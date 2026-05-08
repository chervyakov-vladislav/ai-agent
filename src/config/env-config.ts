import { z } from 'zod';
import { logger } from '@shared/infrastructure/logger/pino-logger';

const envSchema = z.object({
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('debug'),
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  PORT: z.coerce.number().default(3005),
  APP_VERSION: z.string().default('0.0.0'),
  SERVICE_NAME: z.string().default('ai-reviewer'),
  GITHUB_TOKEN: z.string().min(1, 'GITHUB_TOKEN is required'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  RETRY_DELAY: z.coerce.number().default(2000),
  QDRANT_URL: z.url().min(1),
  OLLAMA_URL: z.url().min(1),
  OLLAMA_KEEP_ALIVE: z.string().default('24h'),
  OLLAMA_NUM_PARALLEL: z.coerce.number().int().positive().default(1),
  EMBEDDING_MODEL: z.string().default('nomic-embed-text'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z
    .string()
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  logger.error('Invalid environment variables:', _env.error.issues);
  process.exit(1);
}

export const envConfig = _env.data;

export type EnvConfig = z.infer<typeof envSchema>;
