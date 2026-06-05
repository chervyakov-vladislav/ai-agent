import { Request, Response, NextFunction } from 'express';
import { GithubWebhookSchema } from '../dto-validators/analyze-pr.schema';
import { logger } from '@shared/infrastructure/logger/pino-logger';
import { queuesAdapter } from '@modules/queues/queues.adapter';

export const githubWebhookController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = GithubWebhookSchema.safeParse({
      headers: req.headers,
      body: req.body,
    });

    if (!validation.success || !validation.data) {
      logger.error('Invalid Webhook Data', validation.error);
      return res.status(202).send({ status: 'ignored' });
    }

    const { analyzeCommand, syncCommand, metadata } = validation.data;

    if (analyzeCommand) {
      await queuesAdapter.dispatchAnalysis({
        repoId: metadata.repoId,
        prId: String(metadata.prNumber),
        prUrl: analyzeCommand.prUrl,
      });
      logger.info(`[Controller] Dispatched analysis job for PR #${metadata.prNumber}`);
    }

    if (syncCommand) {
      await queuesAdapter.dispatchIndexing({
        repoId: metadata.repoId,
        repoUrl: metadata.repoUrl,
        commitHash: metadata.commitHash,
      });
      logger.info(`[Controller] Dispatched indexing job for repo ${metadata.repoId}`);
    }

    return res.status(202).send({ status: 'accepted' });
  } catch (err) {
    next(err);
  }
};
