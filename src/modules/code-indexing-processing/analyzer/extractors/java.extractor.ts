import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Parser, { Language } from 'web-tree-sitter';
import { parse, CstNode, IToken } from 'java-parser';
import { logger } from '@shared/infrastructure/logger';
import { BaseSymbol, CodeSymbolKind } from '@contracts/code-analysis.types';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// переписать. работает неправильно. неверно определяются номера строк
// посмотреть реализацию в kilo code на web-tree-sitter
export const getJavaSymbols = (code: string): BaseSymbol[] => {
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
          startLine: node.location?.startLine ?? 0,
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
          startLine: node.location?.startLine ?? 0,
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

// export const getJavaSymbols = async (code: string): Promise<BaseSymbol[]> => {
//   await Parser.init({
//     locateFile(scriptName: string) {
//       return require.resolve(`web-tree-sitter/${scriptName}`);
//     },
//   });
//   const parser = new Parser();

//   const wasmPath = path.join(__dirname, 'tree-sitter-java.wasm');
//   const javaWasm = await Parser.Language.load(wasmPath);
//   parser.setLanguage(javaWasm);
//   const tree = parser.parse(code);

//   console.log(tree.rootNode.toString());

//   if (!tree) throw new Error('Failed to parse');

//   const queryString = `
//   (
//     (block_comment)? @doc
//     .
//     (class_declaration) @class
//   )
// `;

//   const query = javaWasm.query(queryString);
//   const captures = query.captures(tree.rootNode);
//   const symbols: BaseSymbol[] = [];

//   for (const capture of captures) {
//     if (capture.name === 'class') {
//       let node = capture.node;

//       function getRealStart(classNode) {
//         let start = classNode.startIndex;

//         // Берем корень и ищем узел прямо перед нашим классом по индексам
//         // Идем на 1 символ назад от текущего старта
//         let searchIndex = start - 1;

//         while (searchIndex > 0) {
//           let prevNode = tree.rootNode.descendantForIndex(searchIndex);

//           if (prevNode.type === 'block_comment' || prevNode.type === 'line_comment') {
//             // Если нашли комментарий — это наше новое начало
//             start = prevNode.startIndex;
//             // Прыгаем еще выше этого комментария
//             searchIndex = prevNode.startIndex - 1;
//           } else if (prevNode.type === 'program' || !prevNode.isNamed) {
//             // Если это просто пробел, перенос строки или корень — продолжаем ползти вверх
//             searchIndex--;
//           } else {
//             // Если упёрлись в другой важный узел (import) — стоп
//             break;
//           }
//         }
//         return start;
//       }

//       console.log('Итоговый индекс старта:', getRealStart(node));
//     }
//   }

//   const mapKind = (nodeType: string, annotations: string[]): CodeSymbolKind => {
//     if (annotations.includes('Transactional')) return CodeSymbolKind.Transaction;
//     if (annotations.includes('Table')) return CodeSymbolKind.Table;

//     switch (nodeType) {
//       case 'class_declaration':
//         return CodeSymbolKind.Class;
//       case 'interface_declaration':
//         return CodeSymbolKind.Interface;
//       case 'enum_declaration':
//         return CodeSymbolKind.Enum;
//       case 'method_declaration':
//         return CodeSymbolKind.Method;
//       case 'field_declaration':
//         return CodeSymbolKind.Variable;
//       case 'record_declaration':
//         return CodeSymbolKind.Type;
//       default:
//         return CodeSymbolKind.Unknown;
//     }
//   };

//   for (const capture of captures) {
//     if (
//       ['class', 'interface', 'enum', 'method', 'variable', 'type', 'method_with_anno'].includes(
//         capture.name,
//       )
//     ) {
//       const node = capture.node;
//       const nameNode = node.childForFieldName('name') || node.descendantsOfType('identifier')[0];

//       const annotations: string[] = [];
//       const modifiers = node.childForFieldName('modifiers');
//       if (modifiers) {
//         modifiers.descendantsOfType('marker_annotation').forEach((anno) => {
//           const id = anno.childForFieldName('name');
//           if (id) annotations.push(id.text);
//         });
//       }

//       symbols.push({
//         name: nameNode ? nameNode.text : 'Unknown',
//         kind: mapKind(node.type, annotations),
//         startLine: node.startPosition.row + 1,
//         endLine: node.endPosition.row + 1,
//       });
//     }
//   }

//   tree.delete();
//   query.delete();

//   return symbols;
// };
