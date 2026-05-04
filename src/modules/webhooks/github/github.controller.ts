import type { Request, Response, NextFunction } from 'express';
import { GithubAction } from '@shared/types/action.enums';
import { mapGithubToPR } from './github.mapper';
import { GithubPullRequestEvent } from './github.types';
import { analyzePullRequestUseCase } from './use-cases/analyze-pr.use-case';

export const githubController = async (
  req: Request<object, object, GithubPullRequestEvent>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const event = String(req.headers['x-github-event']);
    const payload = req.body;
    const normalizedData = mapGithubToPR(event, payload);

    if (
      normalizedData &&
      (normalizedData.action === GithubAction.Opened ||
        normalizedData.action === GithubAction.Synchronize)
    ) {
      analyzePullRequestUseCase(normalizedData.url, normalizedData.repoUrl).catch((err) => {
        console.error('❌ Фоновая ошибка в AI Agent:', err);
      });
    }

    res.status(202).send({ status: 'accepted' });
  } catch (err) {
    next(err);
  }
};
