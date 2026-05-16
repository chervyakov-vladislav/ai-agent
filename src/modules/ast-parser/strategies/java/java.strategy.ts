import { parse, CstNode, IToken } from 'java-parser';
import { logger } from '@shared/infrastructure/logger/pino-logger';
import {
  BaseSymbol,
  CodeSymbol,
  CodeSymbolKind,
  ImportDetails,
  DocumentInput,
} from '@contracts/code-analysis.types';

const isCstNode = (value: unknown): value is CstNode => {
  return !!value && typeof value === 'object' && 'children' in value;
};

const isToken = (value: unknown): value is IToken => {
  return !!value && typeof value === 'object' && 'image' in value;
};

const getFirstChild = <T extends CstNode | IToken>(
  node: CstNode,
  key: string,
  guard: (value: unknown) => value is T,
): T | undefined => {
  const child = node.children[key]?.[0];
  return guard(child) ? child : undefined;
};

const getChildren = (node: unknown, key: string): unknown[] | undefined => {
  if (!isCstNode(node)) return undefined;
  const child = node.children[key];
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
      isWildcard,
      isStatic,
    });
  }

  return results;
};

export const javaStrategy = {
  extractSymbols: (code: string): BaseSymbol[] => {
    let cst: CstNode;
    try {
      cst = parse(code);
    } catch (error) {
      logger.error('Failed to parse Java code:', error);
      return [];
    }
    const symbols: BaseSymbol[] = [];
    const stack: (CstNode | IToken)[] = [cst];

    while (stack.length > 0) {
      const node = stack.pop();

      if (!isCstNode(node)) {
        continue;
      }

      const isClass = node.name === 'normalClassDeclaration';
      const isInterface = node.name === 'normalInterfaceDeclaration';

      if (isClass || isInterface) {
        const typeId = getFirstChild(node, 'typeIdentifier', isCstNode);
        const idToken = typeId && getFirstChild(typeId, 'Identifier', isToken);

        if (idToken) {
          symbols.push({
            name: idToken.image,
            kind: isClass ? CodeSymbolKind.Class : CodeSymbolKind.Interface,
            startLine: (node.location?.startLine ?? 1) - 1,
            endLine: node.location?.endLine ?? 0,
          });
        }
      }

      if (node.name === 'methodDeclaration') {
        const header = getFirstChild(node, 'methodHeader', isCstNode);
        const declarator = header
          ? getFirstChild(header, 'methodDeclarator', isCstNode)
          : undefined;
        const idToken = declarator ? getFirstChild(declarator, 'Identifier', isToken) : undefined;

        if (idToken) {
          symbols.push({
            name: idToken.image,
            kind: CodeSymbolKind.Method,
            startLine: (node.location?.startLine ?? 1) - 1,
            endLine: node.location?.endLine ?? 0,
          });
        }
      }

      for (const children of Object.values(node.children)) {
        if (Array.isArray(children)) {
          for (const child of children) {
            stack.push(child);
          }
        }
      }
    }

    return symbols;
  },

  extractImports: (content: string): ImportDetails[] => {
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

        result.push({
          source,
          defaultImport: undefined,
          importedSymbols,
          isWildcard,
          isStatic,
        });
      }

      return result.length ? result : fallbackExtractImports(content);
    } catch (error) {
      logger.error('Ошибка парсинга Java imports:', error);
      return fallbackExtractImports(content);
    }
  },

  removeImports: (content: string): string => {
    return content
      .replace(/^import\s+static\s+.*?;\s*$/gm, '')
      .replace(/^import\s+.*?;\s*$/gm, '')
      .trim();
  },

  prepareDocumentInputs: (
    filename: string,
    content: string,
    symbols: CodeSymbol[],
  ): DocumentInput[] => {
    if (symbols.length === 0) {
      return [
        {
          pageContent: content,
          metadata: {
            symbolName: filename,
            symbolKind: CodeSymbolKind.FileContent,
            startLine: 0,
            symbolId: 'file-root',
          },
        },
      ];
    }

    return symbols.map((symbol) => {
      const codeLines = content.split('\n').slice(symbol.startLine, symbol.endLine);
      let codeBlock = codeLines.join('\n');

      // Удаляем импорты специфичным для Java способом
      codeBlock = javaStrategy.removeImports(codeBlock);

      return {
        pageContent: codeBlock,
        metadata: {
          symbolName: symbol.name,
          symbolKind: symbol.kind,
          startLine: symbol.startLine,
          symbolId: symbol.symbol_id,
        },
      };
    });
  },

  createSkeleton: (code: string): string => {
    const lines = code.split('\n');
    const skeleton: string[] = [];
    let braceDepth = 0;
    let isInsideMethod = false;

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('/') || trimmedLine.startsWith('*')) {
        skeleton.push(line);
        continue;
      }

      const openBraces = (trimmedLine.match(/\{/g) || []).length;
      const closeBraces = (trimmedLine.match(/\}/g) || []).length;

      if (braceDepth === 0) {
        skeleton.push(line);
      } else if (braceDepth === 1 && openBraces > 0) {
        const signature = line.split('{')[0].trim();
        skeleton.push(
          `${line.substring(0, line.indexOf(signature) + signature.length)} { /* implementation hidden */ }`,
        );
        isInsideMethod = true;
      } else if (braceDepth === 1 && openBraces === 0 && !isInsideMethod) {
        skeleton.push(line);
      }

      braceDepth += openBraces - closeBraces;

      if (braceDepth <= 1) {
        isInsideMethod = false;
      }
    }

    return skeleton.join('\n');
  },
};
