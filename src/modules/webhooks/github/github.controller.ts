import type { Request, Response, NextFunction } from 'express';
import { mapGithubToPR } from './github.mapper';
import { GithubPullRequestEvent, GithubAction } from './github.types';
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
      analyzePullRequestUseCase(normalizedData.url, normalizedData.repoUrl)
        .then((_context) => {
          console.log(`✅ Context for PR #${normalizedData.number} collected successfully`);
          // await geminiService.review(context)
        })
        .catch((err) => {
          next(err);
        });
    }

    res.status(202).send({ status: 'accepted' });
  } catch (err) {
    next(err);
  }
};
