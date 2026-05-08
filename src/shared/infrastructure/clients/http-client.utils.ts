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
  retries = 3,
  delay = Number(envConfig.RETRY_DELAY) || 2000,
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

    if (retries > 0 && shouldRetry) {
      const currentDelay = delay * (4 - retries);

      logger.warn(
        `Retry triggered (Status: ${status ?? 'Network Error'}). ` +
          `Retrying in ${currentDelay}ms... (Attempts left: ${retries})`,
      );

      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      return withRetry(fn, retries - 1, delay);
    }

    throw error;
  }
};
