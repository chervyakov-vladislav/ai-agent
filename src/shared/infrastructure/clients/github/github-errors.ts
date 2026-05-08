import axios from 'axios';

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
