import { AppError } from 'shared/errors/AppError';
import { NextFunction, Request, Response } from 'express';
import { logger } from '@/shared/infrastructure/logger/pino-logger';
import { InternalServerError } from '@shared/errors/InternalServerError';

export const createErrorFilter = () => {
  return (err: unknown, req: Request, res: Response, _next: NextFunction) => {
    let error: AppError;

    if (err instanceof AppError) {
      error = err;
    } else {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      error = new InternalServerError(message);
    }

    logger.error(error.message, error, {
      requestId: req.id,
      method: req.method,
      url: req.url,
      code: error.code,
      details: !(err instanceof AppError) ? String(err) : undefined,
    });

    res.status(error.statusCode).json({
      status: 'error',
      ...error.toJSON(),
    });
  };
};
