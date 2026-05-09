import { Project, Node } from 'ts-morph';
import { CodeSymbol, CodeSymbolKind } from './processing.types';

export const getDetailedSymbols = (filename: string, code: string): CodeSymbol[] => {
  const project = new Project({
    useInMemoryFileSystem: true,
    skipLoadingLibFiles: true,
    compilerOptions: { allowJs: true },
  });
  const sourceFile = project.createSourceFile(filename, code, { overwrite: true });
  const symbols: CodeSymbol[] = [];

  const addSymbol = (node: Node, kind: CodeSymbolKind, customName?: string) => {
    let name: string | undefined;

    if (customName) {
      name = customName;
    } else {
      // Node.isNameable(node) - слишком строгий для этой задачи и отбрасывает названия функций, интерфейсов, типов и.т.д.
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
          startLine: node.getStartLineNumber(),
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
      addSymbol(declaration, CodeSymbolKind.Type, 'default');
    }
  }

  sourceFile.getVariableDeclarations().forEach((v) => {
    const initializer = v.getInitializer();
    if (!initializer) return;

    const isFunction = Node.isArrowFunction(initializer) || Node.isFunctionExpression(initializer);

    if (isFunction) {
      addSymbol(v, CodeSymbolKind.ConstFunc);
    } else {
      const parentStatement = v.getVariableStatement();
      if (parentStatement?.isExported()) {
        addSymbol(v, CodeSymbolKind.Type);
      }
    }
  });

  return symbols;
};

export const findSymbolsInLines = (
  startLine: number,
  endLine: number,
  symbols: CodeSymbol[],
): { name: string; kind: CodeSymbolKind }[] => {
  return symbols
    .filter((s) => startLine <= s.endLine && endLine >= s.startLine)
    .map((s) => ({ name: s.name, kind: s.kind }));
};
