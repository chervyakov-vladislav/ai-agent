import { AppError } from './AppError';

export class GitHubError extends AppError {
  constructor(message: string, statusCode = 502) {
    super(message, statusCode, 'GITHUB_API_ERROR');
  }
}
