import { parse, CstElement, CstNode } from 'java-parser';
import { logger } from '@shared/infrastructure/logger';

interface JavaParserLocation {
  startOffset: number;
  endOffset: number;
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
}

type JavaNodeWithLocation = Extract<CstElement, CstNode> & {
  location: JavaParserLocation;
};

function isJavaNodeWithLocation(el: CstElement): el is JavaNodeWithLocation {
  const node = el as JavaNodeWithLocation;
  return (
    node !== null &&
    typeof node === 'object' &&
    'location' in node &&
    'children' in node &&
    node.location !== undefined &&
    typeof node.location.startOffset === 'number' &&
    typeof node.location.endOffset === 'number'
  );
}

const JAVA_IMPORT_REGEX = /^import\s+(?:static\s+)?[a-zA-Z0-9_.]+(?:\.\*)?;\s*/gm;

export const removeJavaImports = (content: string): string => {
  try {
    const cst = parse(content);
    const importDeclarations = cst.children.importDeclaration;

    if (!importDeclarations || !Array.isArray(importDeclarations)) {
      return content.trim();
    }

    const rangesToExclude = importDeclarations.filter(isJavaNodeWithLocation).map((node) => ({
      start: node.location.startOffset,
      end: node.location.endOffset,
    }));

    if (rangesToExclude.length === 0) {
      return content.trim();
    }

    rangesToExclude.sort((a, b) => b.start - a.start);

    let result = content;
    for (const range of rangesToExclude) {
      result = result.slice(0, range.start) + result.slice(range.end + 1);
    }

    return result.trim();
  } catch (error) {
    logger.error('Java Parser failed, falling back to Regex:', error);

    return content.replace(JAVA_IMPORT_REGEX, '').trim();
  }
};
