import { App } from './interface/http/app';
import { pinoLogger as logger } from './shared/infrastructure/logger/pino-logger';
import { envConfig } from './config/env-config';
import { createRootRouter } from './interface/http/root-router';

async function bootstrap() {
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', err.stack);

    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    const stack = reason instanceof Error ? reason.stack : undefined;
    const message = reason instanceof Error ? reason.message : String(reason);

    logger.error(`Unhandled Rejection: ${message}`, stack);
  });

  try {
    const rootRouter = createRootRouter();
    const app = new App(rootRouter);
    const port = envConfig.PORT || 3000;
    const server = app.listen(port);

    const shutdown = () => {
      logger.info('Stopping server...');
      server.close(() => {
        logger.info('Server stopped.');
        process.exit(0);
      });

      setTimeout(() => process.exit(1), 5000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error(
      'Failed to start application',
      error instanceof Error ? error.stack : String(error),
    );
    process.exit(1);
  }
}

bootstrap().catch((err) => {
  logger.error('Fatal error during application start:', err);
  process.exit(1);
});
