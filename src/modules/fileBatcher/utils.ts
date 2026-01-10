import { FileNode } from './types';

/**
 * Collects ALL files from a scanned tree
 * (used for backend-only aggregate mode)
 */
export function collectAllFiles(nodes: FileNode[]): FileNode[] {
  let files: FileNode[] = [];

  for (const node of nodes) {
    if (node.type === 'file') {
      files.push(node);
    }

    if (node.type === 'folder' && node.children) {
      files = files.concat(collectAllFiles(node.children));
    }
  }

  return files;
}
