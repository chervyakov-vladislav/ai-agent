import { parse, CstNode, IToken } from 'java-parser';
import { CodeSymbol, CodeSymbolKind } from '../processing.types';
import { logger } from '@shared/infrastructure/logger';

function isCstNode(value: unknown): value is CstNode {
  return !!value && typeof value === 'object' && 'children' in value;
}

function isToken(value: unknown): value is IToken {
  return !!value && typeof value === 'object' && 'image' in value;
}

function getFirstChild<T extends CstNode | IToken>(
  node: CstNode,
  key: string,
  guard: (value: unknown) => value is T,
): T | undefined {
  const child = node.children[key]?.[0];

  return guard(child) ? child : undefined;
}

export const getJavaSymbols = (code: string): CodeSymbol[] => {
  let cst: CstNode;

  try {
    cst = parse(code);
  } catch (error) {
    logger.error('Failed to parse Java code:', error);
    return [];
  }

  const symbols: CodeSymbol[] = [];

  const walk = (node: CstNode | IToken): void => {
    if (!isCstNode(node)) {
      return;
    }

    const isClass = node.name === 'classDeclaration';
    const isInterface = node.name === 'interfaceDeclaration';

    if (isClass || isInterface) {
      const typeIdentifier = getFirstChild(node, 'typeIdentifier', isCstNode);

      const identifier = typeIdentifier
        ? getFirstChild(typeIdentifier, 'Identifier', isToken)
        : undefined;

      if (identifier) {
        symbols.push({
          name: identifier.image,
          kind: isClass ? CodeSymbolKind.Class : CodeSymbolKind.Interface,
          startLine: identifier.startLine ?? node.location?.startLine ?? 0,
          endLine: node.location?.endLine ?? 0,
        });
      }
    }

    if (node.name === 'methodDeclaration') {
      const header = getFirstChild(node, 'methodHeader', isCstNode);

      const declarator = header ? getFirstChild(header, 'methodDeclarator', isCstNode) : undefined;

      const identifier = declarator ? getFirstChild(declarator, 'Identifier', isToken) : undefined;

      if (identifier) {
        symbols.push({
          name: identifier.image,
          kind: CodeSymbolKind.Method,
          startLine: identifier.startLine ?? node.location?.startLine ?? 0,
          endLine: node.location?.endLine ?? 0,
        });
      }
    }

    Object.values(node.children).forEach((children) => {
      children.forEach(walk);
    });
  };

  walk(cst);

  return symbols;
};
