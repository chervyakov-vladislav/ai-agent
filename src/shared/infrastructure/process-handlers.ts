import { logger } from './logger/pino-logger';

export const setupProcessHandlers = () => {
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', {
      message: err.message,
      stack: err.stack,
    });

    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    const stack = reason instanceof Error ? reason.stack : undefined;
    const message = reason instanceof Error ? reason.message : String(reason);

    logger.error(`Unhandled Rejection: ${message}`, { stack });
  });
};
