// import { Project } from 'ts-morph';

/**
 * Удаляет импорты из Java кода с помощью регулярных выражений.
 */
export const removeJavaImports = (content: string): string => {
  return content
    .replace(/^import\s+static\s+.*?;\s*$/gm, '')
    .replace(/^import\s+.*?;\s*$/gm, '')
    .trim();
};

/**
 * Удаляет импорты из JS/TS кода.
 * ts-morph временно закомментирован.
 */
export const removeJsImports = (content: string, _extension: string): string => {
  // const project = new Project({ useInMemoryFileSystem: true });
  // const sourceFile = project.createSourceFile(`temp${_extension}`, content);
  // sourceFile.getImportDeclarations().forEach((decl) => decl.remove());
  // const result = sourceFile.getText().trim();
  // return result;

  // Временная заглушка, возвращающая контент без изменений
  return content.trim();
};

/**
 * Создает "скелет" кода, скрывая реализацию методов.
 */
export const createSkeleton = (code: string): string => {
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
};
