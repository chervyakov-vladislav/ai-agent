import { FilesMapPayload } from './qdrant.types';

export const isFilesMapPayload = (payload: unknown): payload is FilesMapPayload => {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'filename' in payload &&
    'fileHash' in payload &&
    typeof (payload as Record<string, unknown>).filename === 'string' &&
    typeof (payload as Record<string, unknown>).fileHash === 'string'
  );
};
