import parse from 'parse-diff';
import { DiffChunk, FilteredFileDiff } from '@application/contracts/github.types';
import { IGNORED_EXTENSIONS, IGNORED_FILES, IGNORED_DIRECTORIES } from './github.constants';

export interface NormalizedPR {
  id: number;
  number: number;
  title: string;
  author: string;
  url: string;
  repoUrl: string;
  diffUrl: string;
  branch: string;
  repoId: string;
  shouldAnalyze: boolean;
  shouldSync: boolean;
}

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

      const chunks: DiffChunk[] = f.chunks.map((c): DiffChunk => {
        const chunkChanges = c.changes.map((ch) => ch.content).join('\n');

        const cleanCodeForSearch = c.changes
          .filter((ch) => ch.type !== 'del')
          .map((ch) => ch.content.replace(/^[+-]/, ''))
          .join('\n');

        return {
          header: c.content,
          promptContext: `Context for change in ${f.to || f.from} at ${c.content}:\n${chunkChanges}`,
          vectorQuery: cleanCodeForSearch || chunkChanges.replace(/^[+-]/gm, ''),
        };
      });

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
      // перенести определение стратегии в qdrant service при поиске
      let strategy = { threshold: 0.7, limit: 4 };
      if (isNew) strategy = { threshold: 0.6, limit: 5 };
      if (isRenamed) strategy = { threshold: 0.8, limit: 2 };

      return {
        path,
        fileName,
        extension,
        promptData,
        chunks,
        rawDiff: fileDiffString,
        chunksCount: f.chunks.length,
        oldPath: isRenamed ? f.from : undefined,
        isNew,
        isDeleted,
        isRenamed,
        stats: { additions, deletions },
        strategy,
      };
    });
};
