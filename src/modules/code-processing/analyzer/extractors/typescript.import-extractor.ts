import crypto from 'node:crypto';
import { Project } from 'ts-morph';
import { ImportDetails } from '@contracts/code-analysis.types';

const tsProject = new Project({ useInMemoryFileSystem: true });

export const extractJsImports = (content: string, extension: string): ImportDetails[] => {
  const sourceFile = tsProject.createSourceFile(`temp${crypto.randomUUID()}${extension}`, content);
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

  tsProject.removeSourceFile(sourceFile);
  return result;
};
