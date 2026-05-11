export const removeComments = (rawContent: string) => {
  return rawContent.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '');
};
