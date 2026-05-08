import { Project, SyntaxKind, Node } from 'ts-morph';

export type CodeSymbolKind = 'class' | 'function' | 'interface' | 'type' | 'method' | 'const-func';

interface CodeSymbol {
  name: string;
  kind: CodeSymbolKind;
  startLine: number;
  endLine: number;
}

const sharedProject = new Project({
  useInMemoryFileSystem: true,
  compilerOptions: { allowJs: true },
});

export const getDetailedSymbols = (filename: string, code: string): CodeSymbol[] => {
  const sourceFile = sharedProject.createSourceFile(filename, code, { overwrite: true });
  const symbols: CodeSymbol[] = [];

  const addSymbol = (node: Node, kind: CodeSymbolKind, customName?: string) => {
    let name: string | undefined;

    if (customName) {
      name = customName;
    } else if (Node.isNameable(node)) {
      name =
        node.getName() ||
        (Node.isExportGetable(node) && node.isDefaultExport() ? 'default' : undefined);
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

  sourceFile.getClasses().forEach((c) => addSymbol(c, 'class'));
  sourceFile.getFunctions().forEach((f) => addSymbol(f, 'function'));
  sourceFile.getInterfaces().forEach((i) => addSymbol(i, 'interface'));
  sourceFile.getTypeAliases().forEach((t) => addSymbol(t, 'type'));
  sourceFile.getClasses().forEach((cls) => {
    cls.getMethods().forEach((m) => addSymbol(m, 'method'));
  });
  sourceFile.getVariableDeclarations().forEach((v) => {
    if (v.getInitializerIfKind(SyntaxKind.ArrowFunction)) {
      addSymbol(v, 'const-func');
    }
  });

  sharedProject.removeSourceFile(sourceFile);

  return symbols;
};
