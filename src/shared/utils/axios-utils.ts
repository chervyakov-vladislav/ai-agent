import axios from 'axios';
import { envConfig } from '@config/env-config';
import { logger } from '@/shared/infrastructure/logger';

interface GitHubErrorResponse {
  message: string;
  errors?: {
    resource: string;
    code: string;
    field: string;
    message?: string;
  }[];
  documentation_url?: string;
}

export const getGitHubError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    return {
      status: error.response?.status,
      message: (error.response?.data as GitHubErrorResponse)?.message,
      errors: (error.response?.data as GitHubErrorResponse)?.errors,
      isValidationError: error.response?.status === 422,
    };
  }
  return null;
};

interface NetworkError {
  status?: number;
  code?: string;
  response?: {
    status: number;
  };
}

export const isNetworkError = (error: unknown): error is NetworkError => {
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

    if (isNetworkError(error)) {
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
