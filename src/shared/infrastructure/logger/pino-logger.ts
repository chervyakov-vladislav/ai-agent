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
      const targets: pino.TransportTargetOptions[] = [];

      if (isDev) {
        targets.push({
          target: 'pino-pretty',
          level: envConfig.LOG_LEVEL,
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            messageFormat: '{msg}',
            singleLine: !isDebug,
            ignore: 'pid,hostname',
            errorLikeObjectKeys: ['err', 'error'],
          },
        });
      }

      if (envConfig.IS_LOCAL_LOG && isDev) {
        targets.push({
          target: 'pino-roll',
          level: envConfig.LOG_LEVEL,
          options: {
            file: './logs/app',
            extension: '.log',
            frequency: 'daily',
            dateFormat: 'yyyy-MM-dd',
            size: '10m',
            interval: '1d',
            mkdir: true,
          },
        });
      }

      return pino.transport({
        targets,
      });
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

export type Logger = PinoLogger;
export const logger = new PinoLogger();
