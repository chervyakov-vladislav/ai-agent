import { qdrantClient } from '@shared/infrastructure/clients/qdrant-client';
import { QdrantChunkPoint } from '@application/contracts/code-analysis.types';

export type ScrollOffset = Awaited<ReturnType<typeof qdrantClient.scroll>>['next_page_offset'];

export interface FilesMapPayload {
  filename: string;
  fileHash: string;
  sync_id?: string;
}

export interface QdrantScrollResponse {
  points: QdrantChunkPoint[];
  next_page_offset?: string | number | null;
}
