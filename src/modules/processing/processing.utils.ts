import { Project, SyntaxKind, Node } from 'ts-morph';
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
      if (Node.isNameable(node)) {
        name = node.getName();
      }

      if (!name && Node.isExportGetable(node) && node.isDefaultExport()) {
        name = 'default';
      }
    }

    if (name) {
      symbols.push({
        name,
        kind,
        startLine: node.getStartLineNumber(),
        endLine: node.getEndLineNumber(),
      });
    }
  };

  sourceFile.getClasses().forEach((c) => addSymbol(c, CodeSymbolKind.Class));
  sourceFile.getFunctions().forEach((f) => addSymbol(f, CodeSymbolKind.Function));
  sourceFile.getInterfaces().forEach((i) => addSymbol(i, CodeSymbolKind.Interface));
  sourceFile.getTypeAliases().forEach((t) => addSymbol(t, CodeSymbolKind.Type));
  sourceFile.getClasses().forEach((cls) => {
    cls.getMethods().forEach((m) => addSymbol(m, CodeSymbolKind.Method));
  });
  sourceFile.getVariableDeclarations().forEach((v) => {
    if (v.getInitializerIfKind(SyntaxKind.ArrowFunction)) {
      addSymbol(v, CodeSymbolKind.ConstFunc);
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
