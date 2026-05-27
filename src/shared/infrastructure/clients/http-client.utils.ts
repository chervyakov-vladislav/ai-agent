import { envConfig } from '@config/env-config';
import { logger } from '../logger';

interface Retryable {
  status?: number;
  code?: string;
  response?: {
    status: number;
  };
}

export const isRetryable = (error: unknown): error is Retryable => {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('status' in error || 'code' in error || 'response' in error)
  );
};

export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = Number(envConfig.RETRY_DELAY) || 2000,
  attempt = 1,
): Promise<T> => {
  try {
    return await fn();
  } catch (error: unknown) {
    let status: number | undefined;
    let code: string | undefined;

    if (isRetryable(error)) {
      status = error.status || error.response?.status;
      code = error.code;
    }

    const shouldRetry =
      status === 429 ||
      (status !== undefined && status >= 500 && status <= 504) ||
      code === 'ECONNABORTED';

    if (attempt <= maxRetries && shouldRetry) {
      const currentDelay = baseDelay * Math.pow(2, attempt - 1);

      logger.warn(
        `Retry triggered (Status: ${status ?? 'Network Error'}). ` +
          `Retrying in ${currentDelay}ms... (Attempt ${attempt} of ${maxRetries})`,
      );

      await new Promise((resolve) => setTimeout(resolve, currentDelay));

      return withRetry(fn, maxRetries, baseDelay, attempt + 1);
    }

    throw error;
  }
};
