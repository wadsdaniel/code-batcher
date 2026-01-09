import { Request, Response } from 'express';
import { collectSelectedFiles, combineFilesContent, splitContentIntoBatches } from './service';
import { scanProject } from './utils';
import { FileNode } from './types';
import archiver from 'archiver';

/**
 * GET /fileBatcher/scan
 * Scans the given project directory and returns a file/folder tree
 * Respects .gitignore automatically
 */
export const scanProjectHandler = (req: Request, res: Response) => {
  try {
    const projectPath = req.query.projectPath as string;

    if (!projectPath) {
      return res.status(400).json({
        error: 'projectPath query parameter is required',
      });
    }

    const tree: FileNode[] = scanProject(projectPath);

    return res.json({ tree });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: 'Failed to scan project directory',
    });
  }
};

/**
 * POST /fileBatcher/batch
 * Accepts selected files/folders and returns combined & split content
 */
export const batchFiles = (req: Request, res: Response) => {
  try {
    const { selectedTree, projectPath, linesPerBatch } = req.body;

    if (!selectedTree || !projectPath) {
      return res.status(400).json({
        error: 'selectedTree and projectPath are required in body',
      });
    }

    // 1. Collect selected files
    const selectedFiles = collectSelectedFiles(selectedTree);

    // 2. Combine content in Code Batcher format
    const combinedContent = combineFilesContent(selectedFiles, projectPath);

    // 3. Split into batches (user-defined or default)
    const batchSize = linesPerBatch && Number(linesPerBatch) > 0 ? Number(linesPerBatch) : 3000;

    const batches = splitContentIntoBatches(combinedContent, batchSize);

    return res.json({
      totalFiles: selectedFiles.length,
      totalBatches: batches.length,
      batches,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: 'Failed to batch files',
    });
  }
};

/**
 * POST /fileBatcher/download
 * Downloads all selected files as ONE text file
 */
export const downloadBatch = (req: Request, res: Response) => {
  try {
    const { selectedTree, projectPath } = req.body;

    if (!selectedTree || !projectPath) {
      return res.status(400).json({
        error: 'selectedTree and projectPath required',
      });
    }

    const selectedFiles = collectSelectedFiles(selectedTree);
    const combinedContent = combineFilesContent(selectedFiles, projectPath);

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="code-batcher.txt"');

    res.send(combinedContent);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Failed to generate file',
    });
  }
};

/**
 * POST /fileBatcher/download/batches
 * Downloads batched files as a ZIP
 */
export const downloadBatches = (req: Request, res: Response) => {
  try {
    const { selectedTree, projectPath, linesPerBatch } = req.body;

    if (!selectedTree || !projectPath) {
      return res.status(400).json({
        error: 'selectedTree and projectPath required',
      });
    }

    const selectedFiles = collectSelectedFiles(selectedTree);
    const combinedContent = combineFilesContent(selectedFiles, projectPath);

    const batchSize = linesPerBatch && Number(linesPerBatch) > 0 ? Number(linesPerBatch) : 3000;

    const batches = splitContentIntoBatches(combinedContent, batchSize);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="code-batcher-batches.zip"');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    batches.forEach((batch) => {
      archive.append(batch.content, {
        name: `code-batcher-part-${batch.batchNumber}.txt`,
      });
    });

    archive.finalize();
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Failed to generate batch ZIP',
    });
  }
};
