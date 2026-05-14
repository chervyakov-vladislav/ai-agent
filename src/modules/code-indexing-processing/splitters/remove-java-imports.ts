export const removeJavaImports = (content: string): string => {
  return content
    .replace(/^import\s+static\s+.*?;\s*$/gm, '')
    .replace(/^import\s+.*?;\s*$/gm, '')
    .trim();
};
