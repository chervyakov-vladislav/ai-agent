export enum GithubFileStatus {
  Added = 'added',
  Removed = 'removed',
  Modified = 'modified',
  Renamed = 'renamed',
  Copied = 'copied',
  Changed = 'changed',
}

export interface GithubFileResponse {
  sha: string;
  filename: string;
  status: GithubFileStatus;
  additions: number;
  deletions: number;
  changes: number;
  blob_url: string;
  raw_url: string;
  contents_url: string;
  patch?: string;
}

export interface ChangedFile {
  filename: string;
  status: GithubFileResponse['status'];
  content: string;
  fileHash: string;
}
export interface RepositoryMetadata {
  fullName: string;
  description: string | null;
  topics: string[];
  language: string | null;
  defaultBranch: string;
}

export interface FilteredFileDiff {
  path: string;
  fileName: string;
  extension: string;
  rawDiff: string;
  promptData: string;
  chunksCount: number;
  chunks: DiffChunk[];
  oldPath?: string;
  isNew: boolean;
  isDeleted: boolean;
  isRenamed: boolean;
  stats: FileDiffStats;
}

export interface DiffChunk {
  header: string;
  promptContext: string;
  vectorQuery: string;
}

interface FileDiffStats {
  additions: number;
  deletions: number;
}
