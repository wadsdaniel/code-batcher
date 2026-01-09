export interface FileNode {
  name: string;
  path: string; // absolute or relative path within project
  type: 'file' | 'folder';
  children?: FileNode[]; // only for folders
  selected?: boolean; // for selection tracking
}

export interface BatchResult {
  batchNumber: number;
  linesCount: number;
  content: string;
}

export interface ScanOptions {
  rootPath: string; // path to start scanning
  exclude?: string[]; // optional paths/folders to skip
}
