import crypto from 'node:crypto';
import { Project } from 'ts-morph';
import { ImportDetails } from '@contracts/code-analysis.types';

const tsProject = new Project({ useInMemoryFileSystem: true });

export const extractJsImports = (content: string, extension: string): ImportDetails[] => {
  const sourceFile = tsProject.createSourceFile(`temp${crypto.randomUUID()}${extension}`, content);
  const importDeclarations = sourceFile.getImportDeclarations();

  const result = importDeclarations.map((importDecl) => ({
    source: importDecl.getModuleSpecifierValue(),
    defaultImport: importDecl.getDefaultImport()?.getText(),
    importedSymbols: importDecl.getNamedImports().map((s) => s.getName()),
  }));

  tsProject.removeSourceFile(sourceFile);
  return result;
};
