import type { Request, Response, NextFunction } from 'express';
import { logger } from '@shared/infrastructure/logger/pino-logger';
import { analyzePullRequestUseCase } from './github.module';
import { mapGithubToPR } from './github.utils';
import { GithubPullRequestEvent } from './github.types';

export const githubController = async (
  req: Request<object, object, GithubPullRequestEvent>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const event = String(req.headers['x-github-event']);
    const payload = req.body;
    const normalizedData = mapGithubToPR(event, payload);

    if (normalizedData && normalizedData.action) {
      /**
       * TODO: Рефакторинг на BullMQ.
       * Текущий подход через .catch() не гарантирует выполнение при перезагрузке сервера
       * и не имеет механизмов ретраев при сбоях LLM.
       * Ожидаемая реализация: await analyzeQueue.add('analyze-pr', normalizedData);
       */
      analyzePullRequestUseCase(normalizedData.url, normalizedData.repoUrl).catch((err) => {
        logger.error('Background error in AI Agent:', err);
      });
    }

    res.status(202).send({ status: 'accepted' });
  } catch (err) {
    next(err);
  }
};
