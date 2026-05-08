import { App } from './interface/http/express';
import { logger } from './shared/infrastructure/logger/pino-logger';
import { envConfig } from './config/env-config';
import { createRootRouter } from './interface/http/root-router';
import { initQdrant } from './modules/vectorstore/qdrant.service';
import { setupProcessHandlers } from './shared/infrastructure/process-handlers';
import { initInfrastructure } from './shared/infrastructure/init-infrastructure';

async function bootstrap() {
  setupProcessHandlers();

  try {
    logger.info('Starting AI-Agent initialization...');

    await initInfrastructure();
    await initQdrant();

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

      setTimeout(() => {
        logger.warn('Force shutting down after timeout');
        process.exit(1);
      }, 5000);
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
