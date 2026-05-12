import { parse } from 'java-parser';
import { ImportDetails } from '@contracts/code-analysis.types';
import { logger } from '@/shared/infrastructure/logger';

interface Token {
  image: string;
}
interface CstNode {
  children: Record<string, unknown>;
}

const isToken = (node: unknown): node is Token =>
  typeof node === 'object' && node !== null && 'image' in node;

const isCstNode = (node: unknown): node is CstNode =>
  typeof node === 'object' && node !== null && 'children' in node;

const getChildren = (node: unknown, key: string): unknown[] | undefined => {
  if (!isCstNode(node)) return undefined;
  const child = node.children[key as string];
  return Array.isArray(child) ? child : undefined;
};

const extractIdentifiers = (node: unknown): string[] => {
  const idsNode = getChildren(node, 'Identifier');
  if (!idsNode) return [];

  return idsNode.filter(isToken).map((i) => i.image);
};

const fallbackExtractImports = (content: string): ImportDetails[] => {
  const regex = /import\s+(static\s+)?([\w.]+)(\.\*)?;/g;
  const results: ImportDetails[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const isStatic = !!match[1];
    const path = match[2];
    const isWildcard = !!match[3];
    const parts = path.split('.');

    results.push({
      source: path,
      defaultImport: undefined,
      importedSymbols: isWildcard ? ['*'] : [parts[parts.length - 1] || ''],
      type: isStatic ? 'static' : 'normal',
      isWildcard,
      isStatic,
    });
  }

  return results;
};

export const extractJavaImports = (content: string): ImportDetails[] => {
  try {
    const cst = parse(content);

    if (!isCstNode(cst)) {
      return fallbackExtractImports(content);
    }

    const compUnits = getChildren(cst, 'CompilationUnit');
    const compilationUnit = compUnits && compUnits[0];

    if (!isCstNode(compilationUnit)) {
      return fallbackExtractImports(content);
    }

    const importDecls = getChildren(compilationUnit, 'importDeclaration');

    if (!importDecls) {
      return fallbackExtractImports(content);
    }

    const result: ImportDetails[] = [];

    for (const decl of importDecls) {
      if (!isCstNode(decl)) continue;

      const isStatic = Boolean(getChildren(decl, 'Static'));
      const isWildcard = Boolean(getChildren(decl, 'Asterisk'));

      const pkgOrType = getChildren(decl, 'packageOrTypeName')?.[0];
      const identifiers = extractIdentifiers(pkgOrType);
      if (identifiers.length === 0) continue;

      const source = identifiers.join('.');
      const importedSymbols = isWildcard ? ['*'] : [identifiers[identifiers.length - 1]];
      const type = isStatic ? ('static' as const) : ('normal' as const);

      result.push({
        source,
        defaultImport: undefined,
        importedSymbols,
        type,
        isWildcard,
        isStatic,
      });
    }

    return result.length ? result : fallbackExtractImports(content);
  } catch (error) {
    logger.error('Ошибка парсинга Java imports:', error);
    return fallbackExtractImports(content);
  }
};
