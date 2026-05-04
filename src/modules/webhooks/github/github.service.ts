import { githubProvider, githubDiffProvider } from '@shared/infrastructure/axios/github-client';
import { ChangedFile, GithubFileResponse, RepositoryMetadata } from './github.types';
import { pinoLogger } from '@shared/infrastructure/logger/pino-logger';
import { getGitHubError } from '@shared/infrastructure/axios/axios-utils';

export const getPullRequestDiff = async (prUrl: string): Promise<string> => {
  const { data } = await githubDiffProvider.get(prUrl);
  return data;
};

export const getChangedFiles = async (prUrl: string): Promise<ChangedFile[]> => {
  const { data: allFiles } = await githubProvider.get<GithubFileResponse[]>(`${prUrl}/files`);

  const IGNORED_EXTENSIONS = ['.png', '.jpg', '.lock', '.json', '.svg'];
  const IGNORED_FILES = ['package-lock.json'];

  const filteredFiles = allFiles.filter((file) => {
    const isIgnoredExt = IGNORED_EXTENSIONS.some((ext) => file.filename.endsWith(ext));
    const isIgnoredFile = IGNORED_FILES.includes(file.filename);
    return !isIgnoredExt && !isIgnoredFile;
  });

  return Promise.all(
    filteredFiles.map(async (file): Promise<ChangedFile> => {
      const { data: content } = await githubProvider.get<string>(file.contents_url, {
        headers: { Accept: 'application/vnd.github.v3.raw' },
      });

      return {
        filename: file.filename,
        status: file.status,
        content: String(content),
      };
    }),
  );
};

export const getRepositoryInfo = async (repoUrl: string): Promise<RepositoryMetadata> => {
  const { data } = await githubProvider.get(repoUrl);

  return {
    fullName: data.full_name,
    description: data.description,
    topics: data.topics,
    language: data.language,
  };
};

export const createPullRequestReview = async (
  prUrl: string,
  review: {
    verdict: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
    summary: string;
    comments: { file: string; line: number; comment: string }[];
  },
): Promise<void> => {
  const eventMap = {
    APPROVE: 'APPROVE',
    REQUEST_CHANGES: 'REQUEST_CHANGES',
    COMMENT: 'COMMENT',
  };

  const comments = review.comments.map((c) => ({
    path: c.file,
    line: c.line,
    body: c.comment,
    side: 'RIGHT',
  }));

  try {
    await githubProvider.post(`${prUrl}/reviews`, {
      body: review.summary,
      event: eventMap[review.verdict],
      comments: comments.length > 0 ? comments : undefined,
    });
  } catch (error) {
    const ghError = getGitHubError(error);

    if (ghError?.isValidationError) {
      pinoLogger.warn(
        'GitHub rejected line-specific comments (lines out of diff). Sending fallback review.',
      );

      const summaryWithComments = [
        review.summary,
        '\n\n### 💡 Детальные замечания:',
        ...review.comments.map((c) => `* **${c.file}:${c.line}**: ${c.comment}`),
      ].join('\n');

      return await githubProvider.post(`${prUrl}/reviews`, {
        event: eventMap[review.verdict],
        body: summaryWithComments,
      });
    }

    throw error;
  }
};
