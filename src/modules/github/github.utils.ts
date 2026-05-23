import parse from 'parse-diff';
import { FilteredFileDiff } from '@contracts/github.types';
import { IGNORED_EXTENSIONS, IGNORED_FILES, IGNORED_DIRECTORIES } from './github.constants';
import path from 'node:path';

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

/**
 * Парсит сырой гит-дифф, фильтрует мусорные файлы и собирает точные номера
 * измененных строк в НОВОМ файле (ref: head ветка PR) для последующего AST анализа.
 */
export const filterAndParseDiff = (rawDiff: string): FilteredFileDiff[] => {
  const files = parse(rawDiff);

  return files
    .filter((file) => {
      const filePath = (file.to || file.from || '').toLowerCase();
      return !isIgnoredPath(filePath);
    })
    .map((f) => {
      const filePath = f.to || f.from || '';
      const extension = path.extname(filePath).toLowerCase();
      const fileName = filePath.split('/').pop() || '';
      const fromPath = f.from === '/dev/null' ? '/dev/null' : `a/${f.from}`;
      const toPath = f.to === '/dev/null' ? '/dev/null' : `b/${f.to}`;

      const fileDiffString = [
        `diff --git ${fromPath} ${toPath}`,
        `--- ${f.from === '/dev/null' ? '/dev/null' : 'a/' + f.from}`,
        `+++ ${f.to === '/dev/null' ? '/dev/null' : 'b/' + f.to}`,
        ...f.chunks.map((c) => [c.content, ...c.changes.map((ch) => ch.content)].join('\n')),
      ].join('\n');
      const promptData = `FILE: ${filePath}\n\`\`\`diff\n${fileDiffString}\n\`\`\``;

      const changedRanges = f.chunks.map((c) => ({
        start: c.newStart,
        end: c.newStart + Math.max(c.newLines - 1, 0),
      }));

      const isNew = f.new || f.from === '/dev/null';
      const isDeleted = f.deleted || f.to === '/dev/null';
      const isRenamed = f.from !== f.to && f.from !== '/dev/null' && f.to !== '/dev/null';

      const additions = f.chunks.reduce(
        (acc, c) => acc + c.changes.filter((ch) => ch.type === 'add').length,
        0,
      );
      const deletions = f.chunks.reduce(
        (acc, c) => acc + c.changes.filter((ch) => ch.type === 'del').length,
        0,
      );

      return {
        path: filePath,
        fileName,
        extension,
        promptData,
        rawDiff: fileDiffString,
        chunksCount: f.chunks.length,
        oldPath: isRenamed ? f.from : undefined,
        isNew,
        isDeleted,
        isRenamed,
        stats: { additions, deletions },
        changedRanges,
      };
    });
};
