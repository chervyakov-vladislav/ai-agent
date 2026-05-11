import { SUPPORTED_JS_EXTENSIONS } from '../processing.constants';
import { extractJsImports } from './language-extractors/typescript.import-extractor';
import { ImportDetails } from '@contracts/code-analysis.types';
import { extractJavaImports } from './language-extractors/java.import-extractor';

export const extractImports = (content: string, extension: string): ImportDetails[] => {
  let imports: ImportDetails[] = [];

  if (SUPPORTED_JS_EXTENSIONS.has(extension)) {
    imports = extractJsImports(content, extension);
  }

  if (extension === '.java') {
    imports = extractJavaImports(content);
  }

  return imports;
};
