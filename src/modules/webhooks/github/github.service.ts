import { githubProvider, githubDiffProvider } from 'shared/infrastructure/clients/github-client';
import {
  ChangedFile,
  FilteredFileDiff,
  GithubFileResponse,
  RepositoryMetadata,
} from './github.types';
import { logger } from '@shared/infrastructure/logger/pino-logger';
import { getGitHubError } from 'shared/utils/axios-utils';
import { MAX_FILE_SIZE, MAX_REPO_SIZE } from './github.constants';
import { PayloadTooLargeError } from 'shared/errors/413.PayloadTooLargeError';
import { filterAndParseDiff, isIgnoredPath } from './github.utils';

export const getPullRequestDiff = async (prUrl: string): Promise<FilteredFileDiff[]> => {
  const { data } = await githubDiffProvider.get(prUrl);
  const diff = filterAndParseDiff(data);

  return diff;
};

export const getChangedFiles = async (prUrl: string): Promise<ChangedFile[]> => {
  const { data: allFiles } = await githubProvider.get<GithubFileResponse[]>(`${prUrl}/files`);

  const filteredFiles = allFiles.filter((file) => !isIgnoredPath(file.filename));

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

  if (data.size > MAX_REPO_SIZE) {
    throw new PayloadTooLargeError(
      `Repository is too large (${(data.size / 1024).toFixed(2)} MB). Max allowed is 100 MB.`,
    );
  }

  return {
    fullName: data.full_name,
    description: data.description,
    topics: data.topics,
    language: data.language,
    defaultBranch: data.default_branch,
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

export const getRepositoryTree = async (repoId: string, branch: string) => {
  const { data: treeData } = await githubProvider.get<{
    tree: { path: string; type: string; sha: string; size?: number }[];
  }>(`/repos/${repoId}/git/trees/${branch}?recursive=1`);

  return treeData.tree
    .filter((item) => {
      if (item.type !== 'blob') return false;

      const path = item.path.toLowerCase();
      const size = item.size || 0;

      if (size > MAX_FILE_SIZE) {
        logger.warn(
          `Rejected. File is too large: ${path} (${(size / (1024 * 1024)).toFixed(2)} MB). Max allowed is 1 MB.`,
        );
        return false;
      }

      return !isIgnoredPath(path);
    })
    .map((item) => ({
      path: item.path,
      sha: item.sha,
    }));
};

export const getFileContent = async (repoUrl: string, path: string): Promise<string> => {
  const { data } = await githubProvider.get<string>(`${repoUrl}/contents/${path}`, {
    headers: { Accept: 'application/vnd.github.v3.raw' },
  });
  return String(data);
};
