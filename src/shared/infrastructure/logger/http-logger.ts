import { pinoHttp, ReqId } from 'pino-http';
import { IncomingMessage, ServerResponse } from 'http';
import { logger } from '@/shared/infrastructure/logger/pino-logger';

interface ExpressRequest extends IncomingMessage {
  id: ReqId;
  body?: Record<string, string>;
  query?: Record<string, string>;
}

export const createHttpLogger = () => {
  return pinoHttp({
    logger: logger.logger,
    serializers: {
      req: (req: ExpressRequest) => {
        const expressReq = req;

        return {
          method: expressReq.method,
          url: expressReq.url,
          query: expressReq.query,
          body: expressReq.body,
          ip: expressReq.socket?.remoteAddress,
          userAgent: expressReq.headers['user-agent'],
          referer: expressReq.headers['referer'],
        };
      },
    },
    customSuccessMessage: (req: IncomingMessage, res: ServerResponse) =>
      `Request ${req.method} ${req.url} completed with status ${res.statusCode}`,
  });
};
