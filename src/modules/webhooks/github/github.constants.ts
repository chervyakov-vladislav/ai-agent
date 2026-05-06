export const IGNORED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.svg',
  '.ico',
  '.mp4',
  '.mov',
  '.pdf',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.exe',
  '.bin',
  '.dll',
  '.so',
  '.zip',
  '.tar',
  '.gz',
  '.jar',
  '.war',
  '.ear',
  '.class',
  '.log',
  '.sqlite',
  '.db',
];

export const IGNORED_FILES = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'gradle-wrapper.properties',
  '.DS_Store',
  'thumbs.db',
  'LICENSE',
  'authors',
];

export const IGNORED_DIRECTORIES = [
  'node_modules/',
  'dist/',
  'build/',
  '.git/',
  'vendor/',
  'target/',
  'bin/',
  '.idea/',
  '.vscode/',
];

export const MAX_FILE_SIZE = 1024 * 1024;
