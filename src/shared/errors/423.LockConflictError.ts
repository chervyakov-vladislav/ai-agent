import { AppError } from './AppError';

/**
 * Ошибка, возникающая при невозможности захватить блокировку репозитория.
 * Используется воркерами для сигнализации BullMQ о необходимости повтора (retry).
 */
export class LockConflictError extends AppError {
  constructor(message: string) {
    // 423 Locked - семантически подходит для блокировки ресурса
    super(message, 423, 'LOCK_CONFLICT');
  }
}
