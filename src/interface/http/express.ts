import express, { Application, Router } from 'express';
import { Server } from 'http';
import { createHttpLogger } from '@shared/infrastructure/logger/http-logger';
import { createErrorFilter } from './middlewares/error-filter';
import { logger } from '@/shared/infrastructure/logger/pino-logger';

export class App {
  private readonly app: Application = express();
  private server?: Server;

  constructor(private readonly rootRouter: Router) {
    this.setupMiddlewares();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddlewares(): void {
    this.app.disable('x-powered-by');
    this.app.use(express.json());
    this.app.use(createHttpLogger());
  }

  private setupRoutes(): void {
    this.app.use(this.rootRouter);
  }

  private setupErrorHandling(): void {
    this.app.use(createErrorFilter());
  }

  public listen(port: number | string): Server {
    this.server = this.app.listen(port, () => {
      logger.info(`AI-Agent is running on port ${port}`);
    });
    return this.server;
  }
}
