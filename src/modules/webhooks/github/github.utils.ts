import parse from 'parse-diff';
import { IGNORED_EXTENSIONS, IGNORED_FILES, IGNORED_DIRECTORIES } from './github.constants';
import { FilteredFileDiff } from './github.types';

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
        `--- ${fromPath}`,
        `+++ ${toPath}`,
        ...f.chunks.map((c) => [c.content, ...c.changes.map((ch) => ch.content)].join('\n')),
      ].join('\n');
      const promptData = `FILE: ${path}\n\`\`\`diff\n${fileDiffString}\n\`\`\``;

      return {
        path,
        fileName,
        extension,
        promptData,
        rawDiff: fileDiffString,
        chunksCount: f.chunks.length,
      };
    });
};
