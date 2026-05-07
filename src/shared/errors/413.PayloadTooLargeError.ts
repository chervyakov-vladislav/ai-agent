import { AppError } from './AppError';

export class PayloadTooLargeError extends AppError {
  constructor(message = 'Repository is too large to process') {
    super(message, 413, 'REPO_TOO_LARGE');
  }
}
