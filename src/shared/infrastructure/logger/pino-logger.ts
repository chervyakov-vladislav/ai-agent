import pino from 'pino';
import env from '@config/env-config';

export class PinoLogger {
  public readonly logger: pino.Logger;

  constructor() {
    const isDev = env.NODE_ENV !== 'production';

    const transport = isDev
      ? pino.transport({
          target: 'pino-pretty',
          level: env.LOG_LEVEl || 'info',
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
              level: env.LOG_LEVEl || 'info',
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

    this.logger = pino(transport);
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
