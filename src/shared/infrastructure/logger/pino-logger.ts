import pino from 'pino';
import { envConfig } from '@config/env-config';

class PinoLogger {
  public readonly logger: pino.Logger;

  constructor() {
    const isDev = envConfig.NODE_ENV !== 'production';
    const isDebug = envConfig.LOG_LEVEL === 'debug';

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
          level: envConfig.LOG_LEVEL,
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            messageFormat: '{msg}',
            singleLine: !isDebug,
          },
        });
      }
    };

    this.logger = pino(
      {
        level: envConfig.LOG_LEVEL,
        redact: redactConfig,
        base: {
          env: envConfig.NODE_ENV,
          service: envConfig.SERVICE_NAME,
          current_log_level: envConfig.LOG_LEVEL,
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

export const logger = new PinoLogger();
