import { ProcessedChunk } from '../processing/processing.types';

export interface Embedding extends ProcessedChunk {
  embedding: number[];
}
