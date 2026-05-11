export const SUPPORTED_JS_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

export const SPLITTER_CONFIGS: Record<
  'nomic' | 'fullDocument',
  { chunkSize: number; chunkOverlap: number }
> = {
  nomic: { chunkSize: 1500, chunkOverlap: 0 },
  fullDocument: { chunkSize: 4000, chunkOverlap: 0 },
};
