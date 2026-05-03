import { AppError } from 'shared/domain/errors/AppError';
import { NextFunction, Request, Response } from 'express';
import { PinoLogger } from '@/shared/infrastructure/logger/pino-logger';

export const createErrorFilter = (logger: PinoLogger) => {
  return (err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const isAppError = err instanceof AppError;

    const status = isAppError ? err.statusCode : 500;
    const message = isAppError ? err.message : 'Internal Server Error';

    logger.error(message, err instanceof Error ? err : undefined, {
      requestId: req.id,
      method: req.method,
      url: req.url,
      details: !isAppError ? String(err) : undefined,
    });

    res.status(status).json({
      status: 'error',
      message,
    });
  };
};
