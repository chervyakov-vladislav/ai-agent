import { Project, SyntaxKind, Node } from 'ts-morph';

interface CodeSymbol {
  name: string;
  kind: string;
  startLine: number;
  endLine: number;
}

export const getDetailedSymbols = (filename: string, code: string): CodeSymbol[] => {
  const project = new Project();
  const sourceFile = project.createSourceFile(filename, code);
  const symbols: CodeSymbol[] = [];

  const addSymbol = (node: Node, kind: string, customName?: string) => {
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

  return symbols;
};
