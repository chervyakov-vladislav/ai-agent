import { z } from 'zod';
import { ValidationError } from '@shared/errors/ValidationError';

const envSchema = z.object({
  LOG_LEVEL: z
    .enum(
      ['error', 'warn', 'info', 'debug'],
      "LOG_LEVEL must be 'error', 'warn', 'info', or 'debug'",
    )
    .default('debug'),
  IS_LOCAL_LOG: z
    .enum(['true', 'false'], "IS_LOCAL_LOG is required and must be 'true' or 'false'")
    .transform((val) => val === 'true'),
  NODE_ENV: z
    .enum(['development', 'production'], "NODE_ENV must be 'development' or 'production'")
    .default('development'),
  PORT: z.coerce.number().default(3005),
  APP_VERSION: z.string().default('0.0.0'),
  SERVICE_NAME: z.string().default('ai-reviewer'),
  GITHUB_TOKEN: z.string().min(1, 'GITHUB_TOKEN is required'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  RETRY_DELAY: z.coerce.number().default(2000),
  QDRANT_URL: z.url().min(1, 'QDRANT_URL cannot be empty'),
  QDRANT_API_KEY: z.string().min(1, 'QDRANT_API_KEY is required'),
  QDRANT_SEED_ID: z.string().default('1b671a64-40d5-491e-99b0-da01ff1f3341'),
  OLLAMA_URL: z.url('OLLAMA_URL is required').min(1, 'OLLAMA_URL cannot be empty'),
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
  const validationError = new ValidationError('Invalid environment variables:', _env.error);

  console.error('CRITICAL CONFIGURATION ERROR:');
  console.error(JSON.stringify(validationError.toJSON(), null, 2));
  process.exit(1);
}

export const envConfig = _env.data;

export type EnvConfig = z.infer<typeof envSchema>;
