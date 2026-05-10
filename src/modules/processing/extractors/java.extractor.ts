import { parse, CstNode, IToken } from 'java-parser';
import { logger } from '@shared/infrastructure/logger';
import { CodeSymbol, CodeSymbolKind } from '../processing.types';

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

export const getJavaSymbols = (code: string): CodeSymbol[] => {
  let cst: CstNode;
  try {
    cst = parse(code);
  } catch (error) {
    logger.error('Failed to parse Java code:', error);
    return [];
  }
  const symbols: CodeSymbol[] = [];
  const stack: (CstNode | IToken)[] = [cst];

  while (stack.length > 0) {
    const node = stack.pop();

    if (!isCstNode(node)) {
      continue;
    }

    const isClass = node.name === 'classDeclaration';
    const isInterface = node.name === 'interfaceDeclaration';

    if (isClass || isInterface) {
      const typeId = getFirstChild(node, 'typeIdentifier', isCstNode);
      const idToken = typeId ? getFirstChild(typeId, 'Identifier', isToken) : undefined;

      if (idToken) {
        symbols.push({
          name: idToken.image,
          kind: isClass ? CodeSymbolKind.Class : CodeSymbolKind.Interface,
          startLine: idToken.startLine ?? node.location?.startLine ?? 0,
          endLine: node.location?.endLine ?? 0,
        });
      }
    }

    if (node.name === 'methodDeclaration') {
      const header = getFirstChild(node, 'methodHeader', isCstNode);
      const declarator = header ? getFirstChild(header, 'methodDeclarator', isCstNode) : undefined;
      const idToken = declarator ? getFirstChild(declarator, 'Identifier', isToken) : undefined;
      if (idToken) {
        symbols.push({
          name: idToken.image,
          kind: CodeSymbolKind.Method,
          startLine: idToken.startLine ?? node.location?.startLine ?? 0,
          endLine: node.location?.endLine ?? 0,
        });
      }
    }

    for (const children of Object.values(node.children)) {
      for (const child of children) {
        stack.push(child);
      }
    }
  }

  return symbols;
};
