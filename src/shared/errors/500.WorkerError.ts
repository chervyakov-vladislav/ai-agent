import { AppError } from './AppError';

/**
 * Ошибка, возникающая при критических сбоях внутри воркера
 * (например, отсутствие Job ID или невалидные данные).
 */
export class WorkerError extends AppError {
  constructor(message: string, code = 'WORKER_ERROR') {
    super(message, 500, code);
  }
}
