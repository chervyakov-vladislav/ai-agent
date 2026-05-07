import parse from 'parse-diff';
import { IGNORED_EXTENSIONS, IGNORED_FILES, IGNORED_DIRECTORIES } from './github.constants';
import { FilteredFileDiff } from './github.types';
import { GithubAction } from '@shared/types/action.enums';
import { GithubPullRequestEvent } from './github.types';

export interface NormalizedPR {
  id: number;
  number: number;
  title: string;
  author: string;
  action: GithubAction;
  url: string;
  repoUrl: string;
  diffUrl: string;
  branch: string;
}

export const mapGithubToPR = (
  event: string,
  payload: GithubPullRequestEvent,
): NormalizedPR | null => {
  if (event !== 'pull_request') return null;

  const pr = payload.pull_request;
  const repo = payload.repository;

  const action =
    payload.action === GithubAction.Opened || payload.action === GithubAction.Synchronize
      ? payload.action
      : false;

  if (!action) return null;

  return {
    id: pr.id,
    number: pr.number,
    title: pr.title,
    author: pr.user.login,
    action,
    url: pr.url,
    repoUrl: repo.url || `https://api.github.com/repos/${repo.full_name}`,
    diffUrl: pr.diff_url,
    branch: pr.head.ref,
  };
};

export const parseRepoFullName = (url: string): string => {
  return url
    .replace('https://github.com/', '')
    .replace('git@github.com:', '')
    .replace('.git', '')
    .trim();
};

export const isIgnoredPath = (path: string): boolean => {
  if (!path || path === '/dev/null') return true;

  const lowerPath = path.toLowerCase();
  const fileName = lowerPath.split('/').pop() || '';

  const isInIgnoredDir = IGNORED_DIRECTORIES.some((dir) =>
    lowerPath.includes(dir.toLowerCase().replace(/\/$/, '')),
  );
  if (isInIgnoredDir) return true;

  const hasIgnoredExt = IGNORED_EXTENSIONS.some((ext) => lowerPath.endsWith(ext.toLowerCase()));
  if (hasIgnoredExt) return true;

  const isIgnoredFile = IGNORED_FILES.some((f) => fileName === f.toLowerCase());
  if (isIgnoredFile) return true;

  return false;
};

export const filterAndParseDiff = (rawDiff: string): FilteredFileDiff[] => {
  const files = parse(rawDiff);

  return files
    .filter((file) => {
      const path = (file.to || file.from || '').toLowerCase();
      return !isIgnoredPath(path);
    })
    .map((f) => {
      const path = f.to || f.from || '';
      const fileName = path.split('/').pop() || '';
      const extension = fileName.includes('.') ? fileName.split('.').pop() || '' : '';
      const fromPath = f.from === '/dev/null' ? '/dev/null' : `a/${f.from}`;
      const toPath = f.to === '/dev/null' ? '/dev/null' : `b/${f.to}`;
      const fileDiffString = [
        `diff --git ${fromPath} ${toPath}`,
        `--- ${f.from === '/dev/null' ? '/dev/null' : 'a/' + f.from}`,
        `+++ ${f.to === '/dev/null' ? '/dev/null' : 'b/' + f.to}`,
        ...f.chunks.map((c) => [c.content, ...c.changes.map((ch) => ch.content)].join('\n')),
      ].join('\n');
      const promptData = `FILE: ${path}\n\`\`\`diff\n${fileDiffString}\n\`\`\``;
      const chunks = f.chunks.map((c) => {
        const chunkChanges = c.changes.map((ch) => ch.content).join('\n');
        return {
          header: c.content,
          content: chunkChanges,
          searchQuery: `Context for change in ${f.to || f.from} at ${c.content}:\n${chunkChanges}`,
        };
      });

      return {
        path,
        fileName,
        extension,
        promptData,
        chunks,
        rawDiff: fileDiffString,
        chunksCount: f.chunks.length,
      };
    });
};
