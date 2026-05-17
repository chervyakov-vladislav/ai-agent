import { ZodError } from 'zod';
import { AppError } from './AppError';

export interface FieldValidationError {
  field: string;
  message: string;
}

export class ValidationError extends AppError {
  public readonly errors: FieldValidationError[];

  constructor(message: string, zodError?: ZodError) {
    super(message, 400, 'VALIDATION_ERROR');

    this.name = 'ValidationError';

    this.errors = zodError
      ? zodError.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))
      : [];
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      errors: this.errors,
    };
  }
}
