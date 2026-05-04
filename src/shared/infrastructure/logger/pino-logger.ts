import pino from 'pino';
import env from '@config/env-config';

class PinoLogger {
  public readonly logger: pino.Logger;

  constructor() {
    const isDev = env.NODE_ENV !== 'production';

    const redactConfig = {
      paths: [
        'err.config.headers.Authorization',
        'context.headers.Authorization',
        'headers.authorization',
        '*.headers.Authorization',
        'Authorization',
        'token',
        'apiKey',
      ],
      placeholder: '[REDACTED]',
    };

    const getTransport = () => {
      if (isDev) {
        return pino.transport({
          target: 'pino-pretty',
          level: env.LOG_LEVEL,
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            messageFormat: '{msg}',
            singleLine: true,
          },
        });
      }
    };

    this.logger = pino(
      {
        level: env.LOG_LEVEL,
        redact: redactConfig,
        base: {
          env: env.NODE_ENV,
          service: 'ai-reviewer',
        },
      },
      getTransport(),
    );
  }

  info(msg: string, context?: object) {
    this.logger.info(context ?? {}, msg);
  }

  warn(msg: string, context?: object) {
    this.logger.warn(context ?? {}, msg);
  }

  debug(msg: string, context?: object) {
    this.logger.debug(context ?? {}, msg);
  }

  error(msg: string, err?: unknown, context?: object) {
    this.logger.error(
      {
        err,
        ...(context ?? {}),
      },
      msg,
    );
  }
}

export const pinoLogger = new PinoLogger();
