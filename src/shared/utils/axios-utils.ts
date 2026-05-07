import axios from 'axios';
import { envConfig } from '@config/env-config';
import { logger } from '../infrastructure/logger/pino-logger';

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

interface ErrorWithStatus {
  status: number;
}

export const hasStatus = (error: unknown): error is ErrorWithStatus =>
  typeof error === 'object' &&
  error !== null &&
  'status' in error &&
  typeof (error as Record<string, unknown>).status === 'number';

export const withRetry = async <T>(
  fn: () => Promise<T>,
  retries = 3,
  baseDelay = Number(envConfig.RETRY_DELAY) || 2000,
): Promise<T> => {
  try {
    return await fn();
  } catch (error: unknown) {
    if (retries > 0 && hasStatus(error) && error.status === 429) {
      const currentDelay = baseDelay * (4 - retries);

      logger.warn(
        `Rate limit exceeded. Retrying in ${currentDelay}ms... (Attempts left: ${retries})`,
      );

      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      return withRetry(fn, retries - 1, baseDelay);
    }

    throw error;
  }
};
