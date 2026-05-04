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

    const transport = isDev
      ? pino.transport({
          target: 'pino-pretty',
          level: env.LOG_LEVEl,
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            messageFormat: '{msg}',
            singleLine: true,
            ignore: 'pid,hostname',
          },
        })
      : pino.transport({
          targets: [
            {
              target: 'pino-roll', // заменить потом на другой транспорт для отправки в Loki или Elasticsearch
              level: env.LOG_LEVEl,
              options: {
                file: './logs/app',
                extension: '.log',
                frequency: 'daily',
                dateFormat: 'yyyy-MM-dd',
                size: '10k',
                interval: '1d',
                mkdir: true,
              },
            },
          ],
        });

    this.logger = pino(
      {
        level: env.LOG_LEVEl,
        redact: redactConfig,
      },
      transport,
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
