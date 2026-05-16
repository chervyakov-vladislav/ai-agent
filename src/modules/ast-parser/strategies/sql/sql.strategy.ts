import { parse } from 'sql-parser-cst';
import { logger } from '@shared/infrastructure/logger/pino-logger';
import {
  BaseSymbol,
  CodeSymbol,
  CodeSymbolKind,
  ImportDetails,
  DocumentInput,
} from '@contracts/code-analysis.types';

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
    node.range.length === 2
  );
};

const getKind = (type: string): CodeSymbolKind => {
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
      return CodeSymbolKind.Unknown;
  }
};

const getEntityNameString = (node: unknown): string => {
  if (isIdentifier(node)) {
    return node.name || node.text || '';
  }

  if (isMemberExpr(node)) {
    const obj = getEntityNameString(node.object);
    const prop = getEntityNameString(node.property);
    return obj && prop ? `${obj}.${prop}` : obj || prop;
  }

  if (isNode(node) && node.type === 'bigquery_quoted_member_expr' && 'expr' in node) {
    return getEntityNameString(node.expr);
  }

  return '';
};

export const sqlStrategy = {
  extractSymbols: (filename: string, code: string): BaseSymbol[] => {
    let cst;
    try {
      // По умолчанию используем postgresql, как в оригинальном экстракторе
      cst = parse(code, { dialect: 'postgresql' });
    } catch (error) {
      logger.error('SQL Parsing Error:', error);
      return [];
    }

    const getLineFromOffset = (offset: number) => code.substring(0, offset).split('\n').length;
    const symbols: BaseSymbol[] = [];

    for (const stmt of cst.statements) {
      if (!hasRange(stmt)) continue;

      const [startOff, endOff] = stmt.range;
      const startLine = getLineFromOffset(startOff) - 1;
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
            if ('name' in stmt) {
              pushSymbol(getEntityNameString(stmt.name), getKind(stmt.type));
            }
            break;

          case 'alter_table_stmt':
            if ('name' in stmt) {
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
            const name = 'name' in stmt ? getEntityNameString(stmt.name) : '';
            pushSymbol(name ? `${label} ${name}` : label, CodeSymbolKind.Modification);
            break;
          }
        }
      }
    }

    return symbols;
  },

  extractImports: (): ImportDetails[] => {
    // В SQL обычно нет импортов в том же смысле, что и в JS/Java
    return [];
  },

  removeImports: (code: string): string => code,

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
      const codeBlock = codeLines.join('\n');

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
    // Для SQL скелет может быть просто списком команд без тел (если это применимо)
    // Но пока оставим оригинальный контент
    return code;
  },
};
