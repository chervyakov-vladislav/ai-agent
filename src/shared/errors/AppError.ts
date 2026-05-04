export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
    public readonly code?: string,
  ) {
    super(message);

    this.name = this.constructor.name;

    Error.captureStackTrace?.(this, this.constructor);
  }

  toJSON() {
    return {
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
    };
  }
}
