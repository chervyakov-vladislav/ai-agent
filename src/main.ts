import { Router } from 'express';
import { App } from './interface/http/app';
import { PinoLogger } from './shared/infrastructure/logger/pino-logger';
import env from './config/env-config';
import { AppError } from './shared/domain/errors/AppError';

async function bootstrap() {
  const logger = new PinoLogger();

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
    const rootRouter = Router();
    rootRouter.get('/error-app', async () => {
      throw new AppError('Custom Error', 400);
    });

    rootRouter.get('/error-common', () => {
      throw new Error('500 error');
    });

    rootRouter.get('/error-promise', () => {
      void Promise.reject(new Error('unhandled rejection'));
    });

    rootRouter.get('/error-fatal', () => {
      setTimeout(() => {
        throw new Error('dasdad');
      }, 100);
    });
    rootRouter.get('/health', (_req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        node_version: process.version,
        app_version: env.APP_VERSION,
      });
    });

    const app = new App(rootRouter, logger);
    const port = env.PORT || 3000;
    const server = app.listen(port);

    const shutdown = () => {
      logger.info('Stopping server...');
      server.close(() => {
        logger.info('Server stopped.');
        process.exit(0);
      });
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
  console.error('Fatal error during application start:', err);
  process.exit(1);
});
