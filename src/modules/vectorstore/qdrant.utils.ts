import { ChunkMetadata, ProcessedChunk } from '@contracts/code-analysis.types';
import { FilesMapPayload, QdrantChunkPayload, QdrantChunkPoint } from './qdrant.types';

export const isFilesMapPayload = (payload: unknown): payload is FilesMapPayload => {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'filename' in payload &&
    'fileHash' in payload &&
    typeof (payload as Record<string, unknown>).filename === 'string' &&
    typeof (payload as Record<string, unknown>).fileHash === 'string'
  );
};

// перенести в code-searching-processing
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
