import { z } from 'zod';
import { SyncRepoCommand } from '@application/use-cases/repo-sync/repo-sync.types';

const parseRepoFullName = (url: string): string => {
  return url
    .replace('https://github.com/', '')
    .replace('git@github.com:', '')
    .replace('.git', '')
    .trim();
};

export const SyncRepoSchema = z
  .object({
    repoUrl: z.url('Invalid repository URL'),
  })
  .transform(
    (data): SyncRepoCommand => ({
      repoUrl: data.repoUrl,
      repoId: parseRepoFullName(data.repoUrl),
    }),
  );
