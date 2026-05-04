import { pinoHttp, ReqId } from 'pino-http';
import { IncomingMessage, ServerResponse } from 'http';
import { PinoLogger } from './pino-logger';

interface ExpressRequest extends IncomingMessage {
  id: ReqId;
  body?: Record<string, string>;
  query?: Record<string, string>;
}

export const createHttpLogger = (pinoLogger: PinoLogger) => {
  return pinoHttp({
    logger: pinoLogger.logger,
    serializers: {
      req: (req: ExpressRequest) => {
        const expressReq = req;

        return {
          method: expressReq.method,
          url: expressReq.url,
          query: expressReq.query,
          body: expressReq.body,
        };
      },
    },
    customSuccessMessage: (req: IncomingMessage, res: ServerResponse) =>
      `Request ${req.method} ${req.url} completed with status ${res.statusCode}`,
  });
};
