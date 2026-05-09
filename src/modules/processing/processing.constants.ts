import { SupportedTextSplitterLanguage } from '@langchain/textsplitters';

export const SUPPORTED_JS_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

export const LANGCHAIN_LANGUAGE_MAP: Record<string, SupportedTextSplitterLanguage> = {
  // JavaScript / TypeScript
  '.ts': 'js',
  '.tsx': 'js',
  '.js': 'js',
  '.jsx': 'js',

  // Языки программирования
  '.java': 'java',
  '.py': 'python',
  '.cpp': 'cpp',
  '.hpp': 'cpp',
  '.go': 'go',
  '.rb': 'ruby',
  '.rs': 'rust',
  '.swift': 'swift',
  '.php': 'php',

  // Разметка и документация
  '.html': 'html',
  '.htm': 'html',
  '.md': 'markdown',
  '.tex': 'latex',
};

export const CHUNK_SIZE = 1200;
export const CHUNK_OVERLAP = 150;
