import type { Request, Response, NextFunction } from 'express';
import { logger } from '@shared/infrastructure/logger/pino-logger';
import { analyzePullRequestUseCase } from './use-cases/analyze-pr.module';
import { mapGithubToPR } from './github.utils';
import { GithubPullRequestEvent } from './github.types';
import { syncFullRepositoryUseCase } from '../../repo-sync/use-cases/sync-full-repository.module';

export const githubController = async (
  req: Request<object, object, GithubPullRequestEvent>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const event = String(req.headers['x-github-event']);
    const payload = req.body;
    const prData = mapGithubToPR(event, payload);

    if (prData) {
      if (prData.shouldAnalyze) {
        /**
         * TODO: Рефакторинг на BullMQ.
         * Текущий подход через .catch() не гарантирует выполнение при перезагрузке сервера
         * и не имеет механизмов ретраев при сбоях LLM.
         * Ожидаемая реализация: await analyzeQueue.add('analyze-pr', normalizedData);
         */
        analyzePullRequestUseCase(prData.url, prData.repoUrl).catch((err) => {
          logger.error('Background error in AI Agent:', err);
        });
      }

      if (prData.shouldSync) {
        syncFullRepositoryUseCase(prData.repoId).catch((err) => {
          logger.error('Background Sync error:', err);
        });
      }
    }

    res.status(202).send({ status: 'accepted' });
  } catch (err) {
    next(err);
  }
};
