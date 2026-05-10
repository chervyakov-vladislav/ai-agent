import { SupportedTextSplitterLanguage } from '@langchain/textsplitters';

export const SUPPORTED_JS_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
export const SUPPORTED_CONFIG_EXTENSIONS = new Set(['.yaml', '.yml', '.json', '.dockerfile']);

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

// реализовать ParentDocumentRetriever. разделить код на 2 коллекции с маленькими чанками и с большими родительскими. что бы они ссылались друг на друга
export const SPLITTER_CONFIGS: Record<
  'nomic' | 'fullDocument' | 'config',
  { chunkSize: number; chunkOverlap: number }
> = {
  nomic: { chunkSize: 2500, chunkOverlap: 250 },
  fullDocument: { chunkSize: 2500, chunkOverlap: 250 },
  config: { chunkSize: 2500, chunkOverlap: 2500 },
};

// export const SPLITTER_CONFIGS = {
//   // Для поиска (Nomic) — должны быть маленькими для точного попадания
//   child: { chunkSize: 800, chunkOverlap: 80 },

//   // Для контекста (Qwen) — должны быть большими для целостности ревью
//   parent: {
//     default: { chunkSize: 2500, chunkOverlap: 250 },
//     special: { chunkSize: 8000, chunkOverlap: 800 },
//     config:  { chunkSize: 6000, chunkOverlap: 100 },
//   },
// };
