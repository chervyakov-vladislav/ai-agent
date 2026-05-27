import { Request, Response, NextFunction } from 'express';
import { GithubWebhookSchema } from '../dto-validators/analyze-pr.schema';
import { logger } from '@shared/infrastructure/logger/pino-logger';
import { analyzePullRequestUseCase } from '@application/use-cases/analyze-pr/analyze-pr.module';
import { syncFullRepositoryUseCase } from '@application/use-cases/repo-sync/repo-sync.module';

export const githubWebhookController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = GithubWebhookSchema.safeParse({
      headers: req.headers,
      body: req.body,
    });

    if (!validation.success || !validation.data) {
      logger.error('ads', validation.error);
      return res.status(202).send({ status: 'ignored' });
    }

    const { analyzeCommand, syncCommand, metadata } = validation.data;

    if (analyzeCommand) {
      logger.info(`Starting analysis for PR #${metadata.prNumber}`);

      /**
       * TODO: Рефакторинг на BullMQ.
       * Текущий подход через .catch() не гарантирует выполнение при перезагрузке сервера
       * и не имеет механизмов ретраев при сбоях LLM.
       * Ожидаемая реализация: await analyzeQueue.add('analyze-pr', normalizedData);
       */
      analyzePullRequestUseCase({
        prUrl: analyzeCommand.prUrl,
        currentBranch: analyzeCommand.currentBranch,
        collectionName: metadata.collectionName,
        repoUrl: metadata.repoUrl,
        commitHash: metadata.commitHash,
      }).catch((err: unknown) => logger.error('Background analysis error:', err));
    }

    if (syncCommand) {
      logger.info(`Starting sync for repo ${metadata.repoId}`);

      syncFullRepositoryUseCase({
        collectionName: metadata.collectionName,
        repoId: metadata.repoId,
        repoUrl: metadata.repoUrl,
      }).catch((err) => logger.error('Background sync error:', err));
    }

    return res.status(202).send({ status: 'accepted' });
  } catch (err) {
    next(err);
  }
};
