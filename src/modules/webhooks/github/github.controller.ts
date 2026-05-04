import type { Request, Response, NextFunction } from 'express';
import { mapGithubToPR } from './github.mapper';
import { GithubPullRequestEvent } from './github.types';

const githubController = (
  req: Request<object, object, GithubPullRequestEvent>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const event = String(req.headers['x-github-event']);
    const payload = req.body;
    const normalizedData = mapGithubToPR(event, payload);

    if (normalizedData) {
      console.log('Processed PR Action:', normalizedData.action);
      // Здесь вызываем ваш UseCase:
      // githubWebhookUseCase.execute(normalizedData);
    }

    res.status(202).send({ status: 'accepted' });
  } catch (err) {
    next(err);
  }
};

export { githubController };
