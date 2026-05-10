import { logger } from './logger/pino-logger';

export const setupProcessHandlers = () => {
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', err, {
      message: err.message,
    });

    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    const message = reason instanceof Error ? reason.message : String(reason);

    logger.error(`Unhandled Rejection: ${message}`, reason);
  });
};
