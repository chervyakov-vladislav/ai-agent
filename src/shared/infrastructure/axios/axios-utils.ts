import axios from 'axios';
import { pinoLogger } from '../logger/pino-logger';

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

const hasStatus = (error: unknown): error is ErrorWithStatus =>
  typeof error === 'object' &&
  error !== null &&
  'status' in error &&
  typeof (error as Record<string, unknown>).status === 'number';

export const withRetry = async <T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 60000,
): Promise<T> => {
  try {
    return await fn();
  } catch (error: unknown) {
    pinoLogger.warn(`Rate limit exceeded. Retrying in ${delay}ms... (Attempts left: ${retries})`);

    if (retries > 0 && hasStatus(error) && error.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay);
    }

    throw error;
  }
};
