import { AppError } from './AppError';

export class DatabaseTimeoutError extends AppError {
  constructor(message: string) {
    super(message, 504, 'DB_TIMEOUT');
  }
}

export class DatabaseConnectionError extends AppError {
  constructor(message: string) {
    super(message, 503, 'DB_CONNECTION_ERROR');
  }
}
