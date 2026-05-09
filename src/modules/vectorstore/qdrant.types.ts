import { qdrantClient } from '@shared/infrastructure/clients/qdrant-client';

export type ScrollOffset = Awaited<ReturnType<typeof qdrantClient.scroll>>['next_page_offset'];

export interface FilesMapPayload {
  filename: string;
  fileHash: string;
  sync_id?: string;
}
