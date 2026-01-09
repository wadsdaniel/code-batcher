import fs from 'fs';
import path from 'path';
import { FileNode, ScanOptions, BatchResult } from './types';

/**
 * Recursively scans a directory and builds a tree of FileNode
 */
export const scanDirectory = (options: ScanOptions): FileNode[] => {
  const { rootPath, exclude = [] } = options;

  const scan = (dirPath: string): FileNode[] => {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    const nodes: FileNode[] = [];

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      if (exclude.includes(item.name)) continue;

      if (item.isDirectory()) {
        nodes.push({
          name: item.name,
          path: fullPath,
          type: 'folder',
          children: scan(fullPath),
        });
      } else if (item.isFile()) {
        nodes.push({
          name: item.name,
          path: fullPath,
          type: 'file',
        });
      }
    }

    return nodes;
  };

  return scan(rootPath);
};

/**
 * Collect all selected files recursively
 */
export const collectSelectedFiles = (nodes: FileNode[]): FileNode[] => {
  let result: FileNode[] = [];

  for (const node of nodes) {
    if (node.type === 'file' && node.selected) {
      result.push(node);
    } else if (node.type === 'folder' && node.children) {
      if (node.selected) {
        // Folder selected → include all files inside recursively
        result = result.concat(
          collectSelectedFiles(node.children.map((c) => ({ ...c, selected: true }))),
        );
      } else {
        // Folder not selected → check children individually
        result = result.concat(collectSelectedFiles(node.children));
      }
    }
  }

  return result;
};

/**
 * Combine multiple files into a single string
 * Each file is formatted:
 *   <<file-name>>
 *   <<relative-path>>
 *   <<file-content>>
 *   -------- separator --------
 */
export const combineFilesContent = (files: FileNode[], rootPath: string): string => {
  let combined = '';

  for (const file of files) {
    const relativePath = path.relative(rootPath, file.path);
    let content = '';
    try {
      content = fs.readFileSync(file.path, 'utf-8');
      if (!content.trim()) {
        content = 'Empty File/No content';
      }
    } catch {
      content = 'Error reading file';
    }

    combined += `*** ${file.name} ***\n`;
    combined += `*** ${relativePath} ***\n`;
    combined += `${content}\n`;
    combined += `\n----------- End of File -----------\n\n`;
  }

  return combined;
};

/**
 * Split combined content into line-based batches
 */
export const splitContentIntoBatches = (
  content: string,
  linesPerBatch: number = 3000,
): BatchResult[] => {
  const lines = content.split(/\r?\n/);
  const batches: BatchResult[] = [];
  let batchNumber = 1;

  // Use user-specified linesPerBatch or fallback to 3000
  const batchSize = linesPerBatch > 0 ? linesPerBatch : 3000;

  for (let i = 0; i < lines.length; i += batchSize) {
    const batchLines = lines.slice(i, i + batchSize);
    batches.push({
      batchNumber: batchNumber++,
      linesCount: batchLines.length,
      content: batchLines.join('\n'),
    });
  }

  return batches;
};
