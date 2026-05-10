import { parse } from 'sql-parser-cst';
import { logger } from '@shared/infrastructure/logger';
import { CodeSymbol, CodeSymbolKind } from '../processing.types';

const isNode = (node: unknown): node is { type: string } => {
  return (
    typeof node === 'object' && node !== null && 'type' in node && typeof node.type === 'string'
  );
};

const isIdentifier = (
  node: unknown,
): node is { type: 'identifier'; name?: string; text?: string } => {
  return isNode(node) && node.type === 'identifier';
};

const isMemberExpr = (
  node: unknown,
): node is { type: 'member_expr'; object: unknown; property: unknown } => {
  return isNode(node) && node.type === 'member_expr';
};

const hasRange = (node: unknown): node is { range: [number, number] } => {
  return (
    typeof node === 'object' &&
    node !== null &&
    'range' in node &&
    Array.isArray(node.range) &&
    node.range.length === 2 &&
    typeof node.range[0] === 'number' &&
    typeof node.range[1] === 'number'
  );
};

const hasExpr = (node: unknown): node is { expr: unknown } => {
  return typeof node === 'object' && node !== null && 'expr' in node;
};

const hasName = (node: unknown): node is { name: unknown } => {
  return typeof node === 'object' && node !== null && 'name' in node;
};

export const getSqlSymbols = (
  code: string,
  dialect: 'postgresql' | 'mysql' | 'sqlite' = 'postgresql',
): CodeSymbol[] => {
  let cst;
  try {
    cst = parse(code, { dialect });
  } catch (error) {
    logger.error('SQL Parsing Error:', error);
    return [];
  }

  const getLineFromOffset = (offset: number) => code.substring(0, offset).split('\n').length;

  const getEntityNameString = (node: unknown): string => {
    if (isIdentifier(node)) {
      return node.name || node.text || '';
    }

    if (isMemberExpr(node)) {
      const obj = getEntityNameString(node.object);
      const prop = getEntityNameString(node.property);
      return obj && prop ? `${obj}.${prop}` : obj || prop;
    }

    if (isNode(node) && node.type === 'bigquery_quoted_member_expr' && hasExpr(node)) {
      return getEntityNameString(node.expr);
    }

    return '';
  };

  const symbols: CodeSymbol[] = [];

  for (const stmt of cst.statements) {
    if (!hasRange(stmt)) continue;

    const [startOff, endOff] = stmt.range;
    const startLine = getLineFromOffset(startOff);
    const endLine = getLineFromOffset(endOff);

    const pushSymbol = (name: string, kind: CodeSymbolKind) => {
      if (!name) return;
      symbols.push({ name, kind, startLine, endLine });
    };

    if (isNode(stmt)) {
      switch (stmt.type) {
        case 'create_table_stmt':
        case 'create_index_stmt':
        case 'create_view_stmt':
        case 'create_function_stmt':
          if (hasName(stmt)) {
            pushSymbol(getEntityNameString(stmt.name), getKind(stmt.type));
          }
          break;

        case 'alter_table_stmt':
          if (hasName(stmt)) {
            pushSymbol(`ALTER ${getEntityNameString(stmt.name)}`, CodeSymbolKind.Modification);
          }
          break;

        case 'start_transaction_stmt':
          pushSymbol('BEGIN', CodeSymbolKind.Transaction);
          break;

        case 'commit_transaction_stmt':
          pushSymbol('COMMIT', CodeSymbolKind.Transaction);
          break;

        case 'rollback_transaction_stmt':
          pushSymbol('ROLLBACK', CodeSymbolKind.Transaction);
          break;

        default: {
          const label = stmt.type.replace(/_stmt$/, '').toUpperCase();
          const name = hasName(stmt) ? getEntityNameString(stmt.name) : '';

          pushSymbol(name ? `${label} ${name}` : label, CodeSymbolKind.Modification);
          break;
        }
      }
    }
  }

  return symbols;
};

function getKind(type: string): CodeSymbolKind {
  switch (type) {
    case 'create_table_stmt':
      return CodeSymbolKind.Table;
    case 'create_index_stmt':
      return CodeSymbolKind.Index;
    case 'create_view_stmt':
      return CodeSymbolKind.View;
    case 'create_function_stmt':
      return CodeSymbolKind.Function;
    default:
      return CodeSymbolKind.Modification;
  }
}
