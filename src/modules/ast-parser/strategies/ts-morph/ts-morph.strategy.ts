import { Project, Node } from 'ts-morph';
import crypto from 'node:crypto';
import {
  BaseSymbol,
  CodeSymbol,
  CodeSymbolKind,
  ImportDetails,
  DocumentInput,
} from '@contracts/code-analysis.types';

const project = new Project({
  useInMemoryFileSystem: true,
  skipLoadingLibFiles: true,
  compilerOptions: { allowJs: true },
});

export const tsMorphStrategy = {
  extractSymbols: (filename: string, code: string): BaseSymbol[] => {
    const sourceFile = project.createSourceFile(`${crypto.randomUUID()}_${filename}`, code, {
      overwrite: true,
    });
    const symbols: BaseSymbol[] = [];

    const addSymbol = (node: Node, kind: CodeSymbolKind, customName?: string) => {
      let name: string | undefined;

      if (customName) {
        name = customName;
      } else {
        if ('getName' in node && typeof node.getName === 'function') {
          name = node.getName();
        }

        if (!name && Node.isExportGetable(node) && node.isDefaultExport()) {
          name = 'default';
        }
      }

      if (name) {
        const isDuplicate = symbols.some(
          (s) => s.name === name && s.startLine === node.getStartLineNumber(),
        );

        if (!isDuplicate) {
          symbols.push({
            name,
            kind,
            startLine: node.getStartLineNumber(true) > 0 ? node.getStartLineNumber(true) - 1 : 0,
            endLine: node.getEndLineNumber(),
          });
        }
      }
    };

    sourceFile.getClasses().forEach((c) => addSymbol(c, CodeSymbolKind.Class));
    sourceFile.getFunctions().forEach((f) => addSymbol(f, CodeSymbolKind.Function));
    sourceFile.getInterfaces().forEach((i) => addSymbol(i, CodeSymbolKind.Interface));
    sourceFile.getTypeAliases().forEach((t) => addSymbol(t, CodeSymbolKind.Type));
    sourceFile.getEnums().forEach((e) => addSymbol(e, CodeSymbolKind.Enum));
    sourceFile.getClasses().forEach((cls) => {
      cls.getMethods().forEach((m) => addSymbol(m, CodeSymbolKind.Method));
    });

    const defaultExportSymbol = sourceFile.getDefaultExportSymbol();

    if (defaultExportSymbol) {
      const declaration = defaultExportSymbol.getDeclarations()[0];
      if (declaration) {
        let kind = CodeSymbolKind.Variable;

        if (Node.isExpressionStatement(declaration) || Node.isCallExpression(declaration)) {
          kind = CodeSymbolKind.ConstFunc;
        }

        addSymbol(declaration, kind, 'defaultConfig');
      }
    }

    sourceFile.getVariableDeclarations().forEach((v) => {
      const initializer = v.getInitializer();
      if (!initializer) return;

      const name = v.getName();
      const parentStatement = v.getVariableStatement();
      const isExported =
        parentStatement?.isExported() || sourceFile.getExportedDeclarations().has(name);

      if (!isExported) return;

      const isFunction =
        Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer);
      const isFunctionalAction =
        Node.isCallExpression(initializer) || Node.isNewExpression(initializer);

      if (isFunction || isFunctionalAction) {
        return addSymbol(v, CodeSymbolKind.ConstFunc);
      }

      const isObject = Node.isObjectLiteralExpression(initializer);
      if (isObject) {
        return addSymbol(v, CodeSymbolKind.Variable);
      }

      if (Node.isStringLiteral(initializer) || Node.isNumericLiteral(initializer)) {
        return;
      }

      addSymbol(v, CodeSymbolKind.Variable);
    });

    project.removeSourceFile(sourceFile);
    return symbols;
  },

  extractImports: (filename: string, code: string): ImportDetails[] => {
    const sourceFile = project.createSourceFile(`${crypto.randomUUID()}_${filename}`, code, {
      overwrite: true,
    });
    const importDeclarations = sourceFile.getImportDeclarations();

    const result = importDeclarations.map((importDecl) => {
      const namespaceImport = importDecl.getNamespaceImport();
      const isWildcard = Boolean(namespaceImport);

      return {
        source: importDecl.getModuleSpecifierValue(),
        defaultImport: importDecl.getDefaultImport()?.getText(),
        importedSymbols: isWildcard ? ['*'] : importDecl.getNamedImports().map((s) => s.getName()),
        isWildcard,
      };
    });

    project.removeSourceFile(sourceFile);
    return result;
  },

  removeImports: (filename: string, code: string): string => {
    const sourceFile = project.createSourceFile(`${crypto.randomUUID()}_${filename}`, code, {
      overwrite: true,
    });

    sourceFile.getImportDeclarations().forEach((decl) => decl.remove());

    const result = sourceFile.getText().trim();

    project.removeSourceFile(sourceFile);
    return result;
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

      // Удаляем импорты специфичным для JS/TS способом
      codeBlock = tsMorphStrategy.removeImports(filename, codeBlock);

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
