import { qdrantClient } from '@shared/infrastructure/clients/qdrant-client';
import { ChunkMetadata } from '@application/contracts/code-analysis.types';

export type ScrollOffset = Awaited<ReturnType<typeof qdrantClient.scroll>>['next_page_offset'];

export interface FilesMapPayload {
  filename: string;
  fileHash: string;
  sync_id?: string;
}

export type QdrantChunkPayload = ChunkMetadata & {
  content: string;
};
export interface QdrantChunkPoint {
  id: string | number;
  payload: QdrantChunkPayload;
  vector?: number[] | Record<string, number[]>;
  score?: number;
  shard_key?: string;
}

export interface QdrantScrollResponse {
  points: QdrantChunkPoint[];
  next_page_offset?: string | number | null;
}
