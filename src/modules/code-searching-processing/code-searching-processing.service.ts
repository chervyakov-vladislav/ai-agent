import {
  ChunkMetadata,
  DiffSearchStrategy,
  ProcessedChunk,
  QdrantChunkPayload,
  QdrantChunkPoint,
} from '@application/contracts/code-analysis.types';

export const getSearchStrategy = (params: {
  isNew: boolean;
  isRenamed: boolean;
  extension: string;
  additions: number;
}): DiffSearchStrategy => {
  const { isNew, isRenamed, extension, additions } = params;

  let threshold = 0.75;
  let limit = 4;

  const isDataFile = ['json', 'yaml', 'yml', 'xml', 'md'].includes(extension);
  const isConfig = ['config', 'setup', 'env'].some((kw) => extension.includes(kw));

  if (isDataFile || isConfig) {
    threshold = 0.85;
    limit = 2;
  }

  if (isRenamed) {
    threshold = 0.8;
    limit = 2;
  } else if (isNew) {
    threshold = additions < 20 ? 0.8 : 0.75;
    limit = 3;
  }

  if (extension === 'css' || extension === 'scss') {
    threshold = 0.9;
    limit = 1;
  }

  return { threshold, limit };
};

const formatImportsForLLM = (metadata: ChunkMetadata): string => {
  const { imports, language } = metadata;

  if (!imports || imports.length === 0) return '';

  const formattedLines = imports.map((imp) => {
    if (language === 'java') {
      const staticPrefix = imp.isStatic ? 'static ' : '';
      const wildcardSuffix = imp.isWildcard ? '.*' : '';

      return `import ${staticPrefix}${imp.source}${wildcardSuffix};`;
    }

    const isTSorJS =
      language === 'ts' ||
      language === 'js' ||
      language === 'typescript' ||
      language === 'javascript';

    if (isTSorJS) {
      if (imp.isWildcard) {
        const alias =
          imp.defaultImport || (imp.importedSymbols[0] !== '*' ? imp.importedSymbols[0] : 'module');
        return `import * as ${alias} from '${imp.source}';`;
      }

      const parts: string[] = [];

      if (imp.defaultImport) {
        parts.push(imp.defaultImport);
      }

      if (imp.importedSymbols && imp.importedSymbols.length > 0) {
        parts.push(`{ ${imp.importedSymbols.join(', ')} }`);
      }

      if (parts.length === 0) {
        return `import '${imp.source}';`;
      }

      return `import ${parts.join(', ')} from '${imp.source}';`;
    }

    return `import ${imp.source};`;
  });

  return Array.from(new Set(formattedLines)).join('\n');
};

// перенести в code-searching-processing
export const reconstructChunks = (points: QdrantChunkPoint[]): ProcessedChunk[] => {
  const groups = new Map<string, QdrantChunkPayload[]>();

  for (const point of points) {
    const payload = point.payload;
    if (!payload?.parent_id) continue;
    if (!groups.has(payload.parent_id)) groups.set(payload.parent_id, []);
    groups.get(payload.parent_id)?.push(payload);
  }

  return Array.from(groups.values()).map((parts) => {
    const sorted = parts.sort((a, b) => a.partIndex - b.partIndex);
    const meta = sorted[0];

    const importsCode = formatImportsForLLM(meta);

    const cleanCode = sorted
      .map((p) => {
        const contentParts = p.content.split('---\n');
        return contentParts.length > 1 ? contentParts.slice(1).join('---\n') : p.content;
      })
      .join('\n');

    const fullContent = [`// File: ${meta.filename}`, importsCode, '', cleanCode]
      .filter(Boolean)
      .join('\n');

    return {
      content: fullContent,
      metadata: { ...meta, hasParts: false },
    };
  });
};
