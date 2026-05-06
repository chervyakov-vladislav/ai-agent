import { githubProvider, githubDiffProvider } from 'shared/infrastructure/clients/github-client';
import { ChangedFile, GithubFileResponse, RepositoryMetadata } from './github.types';
import { logger } from '@shared/infrastructure/logger/pino-logger';
import { getGitHubError } from 'shared/infrastructure/clients/axios-utils';
import { IGNORED_EXTENSIONS, IGNORED_FILES } from './github.constants';

export const getPullRequestDiff = async (prUrl: string): Promise<string> => {
  const { data } = await githubDiffProvider.get(prUrl);
  return data;
};

export const getChangedFiles = async (prUrl: string): Promise<ChangedFile[]> => {
  const { data: allFiles } = await githubProvider.get<GithubFileResponse[]>(`${prUrl}/files`);

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
  const comments = review.comments.map((c) => ({
    path: c.file,
    line: c.line,
    body: c.comment,
    side: 'RIGHT',
  }));

  try {
    await githubProvider.post(`${prUrl}/reviews`, {
      body: review.summary,
      event: review.verdict,
      comments: comments.length > 0 ? comments : undefined,
    });
  } catch (error) {
    const ghError = getGitHubError(error);

    if (ghError?.isValidationError) {
      logger.warn(
        'GitHub rejected line-specific comments (lines out of diff). Sending fallback review.',
      );

      const summaryWithComments = [
        review.summary,
        '\n\n### 💡 Детальные замечания:',
        ...review.comments.map((c) => `* **${c.file}:${c.line}**: ${c.comment}`),
      ].join('\n');

      return await githubProvider.post(`${prUrl}/reviews`, {
        event: review.verdict,
        body: summaryWithComments,
      });
    }

    throw error;
  }
};

export const getRepositoryReadme = async (repoUrl: string): Promise<string | null> => {
  try {
    const { data } = await githubProvider.get<{ content: string }>(`${repoUrl}/readme`);

    if (!data?.content) {
      return null;
    }

    const fullReadme = Buffer.from(data.content, 'base64').toString('utf-8');

    const START_MARKER = '<!-- AI_CONTEXT_START -->';
    const END_MARKER = '<!-- AI_CONTEXT_END -->';

    if (fullReadme.includes(START_MARKER) && fullReadme.includes(END_MARKER)) {
      const parts = fullReadme.split(START_MARKER);
      const targetPart = parts[1].split(END_MARKER)[0];
      return targetPart.trim();
    }

    return fullReadme.trim();
  } catch (error) {
    const ghError = getGitHubError(error);

    if (ghError?.status === 404) {
      logger.info(`No README found for repository: ${repoUrl}`);
      return null;
    }

    logger.error(`Error fetching README from ${repoUrl}`, error);
    throw error;
  }
};
