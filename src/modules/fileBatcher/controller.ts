import { Request, Response } from 'express';
import { collectSelectedFiles, combineFilesContent, splitContentIntoBatches } from './service';
import { scanProject } from '../../shared/utils/fileUtils';
import { FileNode } from './types';
import archiver from 'archiver';
import { logger } from '../../shared/logger';
import { collectAllFiles } from './utils';

/**
 * GET /fileBatcher/scan
 * Scans the given project directory and returns a file/folder tree
 * Respects .gitignore automatically
 */
export const scanProjectHandler = (req: Request, res: Response) => {
  try {
    const projectPath = req.query.projectPath as string;

    if (!projectPath) {
      logger.error('projectPath query parameter missing');
      return res.status(400).json({
        error: 'projectPath query parameter is required',
      });
    }

    logger.info(`Scanning project directory: ${projectPath}`);
    const tree: FileNode[] = scanProject(projectPath);
    logger.info(`Scan complete: found ${tree.length} top-level nodes`);

    return res.json({ tree });
  } catch (err) {
    logger.error({ err }, 'Failed to scan project directory');
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
      logger.error('selectedTree or projectPath missing in batch request');
      return res.status(400).json({
        error: 'selectedTree and projectPath are required in body',
      });
    }

    logger.info(`Batching files from project: ${projectPath}`);
    const selectedFiles = collectSelectedFiles(selectedTree);
    const combinedContent = combineFilesContent(selectedFiles, projectPath);
    const batchSize = linesPerBatch && Number(linesPerBatch) > 0 ? Number(linesPerBatch) : 3000;
    const batches = splitContentIntoBatches(combinedContent, batchSize);

    logger.info(`Batching complete: ${batches.length} batches created`);

    return res.json({
      totalFiles: selectedFiles.length,
      totalBatches: batches.length,
      batches,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to batch files');
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
      logger.error('selectedTree or projectPath missing in download request');
      return res.status(400).json({
        error: 'selectedTree and projectPath required',
      });
    }

    logger.info(`Generating single text download for project: ${projectPath}`);
    const selectedFiles = collectSelectedFiles(selectedTree);
    const combinedContent = combineFilesContent(selectedFiles, projectPath);

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="code-batcher.txt"');
    res.send(combinedContent);

    logger.info(`Download prepared: ${selectedFiles.length} files`);
  } catch (err) {
    logger.error({ err }, 'Failed to generate file download');
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
      logger.error('selectedTree or projectPath missing in download-batches request');
      return res.status(400).json({
        error: 'selectedTree and projectPath required',
      });
    }

    logger.info(`Generating ZIP of batches for project: ${projectPath}`);
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

    logger.info(`ZIP generation started for ${batches.length} batches`);
  } catch (err) {
    logger.error({ err }, 'Failed to generate batch ZIP');
    res.status(500).json({
      error: 'Failed to generate batch ZIP',
    });
  }
};

/**
 * POST /fileBatcher/aggregate
 * Automatically scans the entire project,
 * selects ALL files, batches them,
 * and downloads the batches as a ZIP.
 */
export const aggregateProject = (req: Request, res: Response) => {
  try {
    const { projectPath, linesPerBatch } = req.body;

    if (!projectPath) {
      return res.status(400).json({
        error: 'projectPath is required',
      });
    }

    logger.info('[AGGREGATE] Starting full project aggregation', {
      projectPath,
    });

    /**
     * 1. Scan entire project
     */
    const tree: FileNode[] = scanProject(projectPath);

    /**
     * 2. Force-select everything
     */
    const selectAll = (nodes: FileNode[]) => {
      for (const node of nodes) {
        node.selected = true;
        if (node.children?.length) {
          selectAll(node.children);
        }
      }
    };

    selectAll(tree);

    /**
     * 3. Collect all files
     */
    const selectedFiles = collectSelectedFiles(tree);

    logger.info('[AGGREGATE] Files collected', {
      totalFiles: selectedFiles.length,
    });

    /**
     * 4. Combine + batch
     */
    const combinedContent = combineFilesContent(selectedFiles, projectPath);

    const batchSize = linesPerBatch && Number(linesPerBatch) > 0 ? Number(linesPerBatch) : 3000;

    const batches = splitContentIntoBatches(combinedContent, batchSize);

    logger.info('[AGGREGATE] Batches created', {
      totalBatches: batches.length,
      batchSize,
    });

    /**
     * 5. Stream ZIP download
     */
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="code-batcher-aggregate.zip"');

    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err) => {
      logger.error('[AGGREGATE] ZIP generation failed', err);
      res.status(500).end();
    });

    archive.pipe(res);

    batches.forEach((batch) => {
      archive.append(batch.content, {
        name: `batch-${batch.batchNumber}.txt`,
      });
    });

    archive.finalize();

    logger.info('[AGGREGATE] ZIP stream finalized');
  } catch (err) {
    logger.error('[AGGREGATE] Fatal error', err);
    res.status(500).json({
      error: 'Failed to aggregate project',
    });
  }
};
