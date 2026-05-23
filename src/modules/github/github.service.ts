import path from 'node:path';
import {
  githubProvider,
  githubDiffProvider,
} from '@shared/infrastructure/clients/github/github-client';
import { AIReviewResponse } from '@contracts/llm.types';
import { logger } from '@shared/infrastructure/logger/pino-logger';
import { getGitHubError } from '@shared/infrastructure/clients/github/github-errors';
import { PayloadTooLargeError } from '@shared/errors/413.PayloadTooLargeError';
import { GitHubError } from '@shared/errors/502.GithubError';
import {
  ChangedFile,
  FilteredFileDiff,
  GetFileContentParams,
  GithubFileResponse,
  RepositoryMetadata,
} from '@contracts/github.types';
import { filterAndParseDiff, isIgnoredPath, parseRepoFullName } from './github.utils';
import { githubContentSchema } from './github.validators';
import { MAX_FILE_SIZE, MAX_REPO_SIZE } from './github.constants';

export const getPullRequestDiff = async (prUrl: string): Promise<FilteredFileDiff[]> => {
  const { data } = await githubDiffProvider.get(prUrl);
  const result = githubContentSchema.safeParse(data);

  if (!result.success) {
    logger.error(`[GitHub] Failed to get valid content for ${prUrl}`, result.error.issues);
    throw new GitHubError(`Invalid file content received from GitHub for ${prUrl}`);
  }

  const diff = filterAndParseDiff(result.data);

  return diff;
};

export const getChangedFiles = async (prUrl: string): Promise<ChangedFile[]> => {
  const { data: allFiles } = await githubProvider.get<GithubFileResponse[]>(`${prUrl}/files`);

  const filteredFiles = allFiles.filter((file) => !isIgnoredPath(file.filename));

  return Promise.all(
    filteredFiles.map(async (file): Promise<ChangedFile> => {
      const { data: content } = await githubProvider.get<string>(file.contents_url, {
        headers: { Accept: 'application/vnd.github.v3.raw' },
        responseType: 'text',
      });

      const result = githubContentSchema.safeParse(content);

      if (!result.success) {
        logger.error(
          `[GitHub] Failed to get valid content for ${file.filename}`,
          result.error.issues,
        );
        throw new GitHubError(`Invalid file content received from GitHub for ${file}`);
      }

      return {
        filename: file.filename,
        status: file.status,
        content: result.data,
        fileHash: file.sha,
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
  review: AIReviewResponse,
): Promise<void> => {
  const comments = review.reviews.map((c) => ({
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
        ...review.reviews.map((c) => `* **${c.file}:${c.line}**: ${c.comment}`),
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

export const getRepositoryTree = async (repoUrl: string, branch: string) => {
  const repoId = parseRepoFullName(repoUrl);
  const { data: treeData } = await githubProvider.get<{
    tree: { path: string; type: string; sha: string; size?: number }[];
  }>(`/repos/${repoId}/git/trees/${branch}?recursive=1`);

  return treeData.tree
    .filter((item) => {
      if (item.type !== 'blob') return false;

      const path = item.path.toLowerCase();
      const size = item.size || 0;

      if (size > MAX_FILE_SIZE) {
        logger.warn('File size limit exceeded', { path, size: size / (1024 * 1024) });
        return false;
      }

      return !isIgnoredPath(path);
    })
    .map((item) => {
      const extension = path.extname(item.path).toLowerCase();
      return {
        path: item.path,
        sha: item.sha,
        extension,
      };
    });
};

export const getFileContent = async ({
  filePath,
  repoUrl,
  branch,
}: GetFileContentParams): Promise<{ content: string }> => {
  const config: {
    headers: Record<string, string>;
    responseType: 'text';
    params?: { ref: string };
  } = {
    headers: { Accept: 'application/vnd.github.v3.raw' },
    responseType: 'text',
  };

  if (branch) {
    config.params = { ref: branch };
  }

  const { data } = await githubProvider.get<string>(`${repoUrl}/contents/${filePath}`, config);
  const result = githubContentSchema.safeParse(data);

  if (!result.success) {
    logger.error(`[GitHub] Failed to get valid content for ${filePath}`, result.error.issues);
    throw new GitHubError(`Invalid file content received from GitHub for ${filePath}`);
  }

  return {
    content: result.data,
  };
};
