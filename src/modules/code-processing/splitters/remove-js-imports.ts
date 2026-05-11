import { Project } from 'ts-morph';

const project = new Project({ useInMemoryFileSystem: true });

let fileCounter = 0;

export const removeJsImports = (content: string, extension: string): string => {
  const fileName = `temp_${fileCounter++}${extension}`;
  const sourceFile = project.createSourceFile(fileName, content, { overwrite: true });

  sourceFile.getImportDeclarations().forEach((decl) => decl.remove());

  const result = sourceFile.getFullText().trim();

  project.removeSourceFile(sourceFile);

  return result;
};
