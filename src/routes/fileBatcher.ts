import { Router } from 'express';
import {
  scanProjectHandler,
  batchFiles,
  downloadBatch,
  downloadBatches,
} from '../modules/fileBatcher/controller';

import { z } from 'zod';
import { validateBody, validateQuery } from '../shared/http/validate';
import { apiLimiter } from '../shared/utils/rateLimiter'; // <-- import

const router = Router();

// Apply rate limiter to all routes in this router
router.use(apiLimiter);

/**
 * SCAN PROJECT
 * GET /scan?projectPath=...
 */
const scanProjectSchema = z.object({
  projectPath: z.string().min(1, 'projectPath query parameter is required'),
});

router.get('/scan', validateQuery(scanProjectSchema), scanProjectHandler);

/**
 * BATCH FILES
 * POST /batch
 */
const batchFilesSchema = z.object({
  projectPath: z.string().min(1, 'projectPath is required'),
  selectedTree: z.array(z.any()).nonempty('selectedTree cannot be empty'),
  linesPerBatch: z.number().optional(),
});

router.post('/batch', validateBody(batchFilesSchema), batchFiles);

/**
 * DOWNLOAD SINGLE FILE
 * POST /download
 */
const downloadBatchSchema = z.object({
  projectPath: z.string().min(1, 'projectPath is required'),
  selectedTree: z.array(z.any()).nonempty('selectedTree cannot be empty'),
});

router.post('/download', validateBody(downloadBatchSchema), downloadBatch);

/**
 * DOWNLOAD BATCHES (ZIP)
 * POST /download-batches
 */
const downloadBatchesSchema = z.object({
  projectPath: z.string().min(1, 'projectPath is required'),
  selectedTree: z.array(z.any()).nonempty('selectedTree cannot be empty'),
  linesPerBatch: z.number().optional(),
});

router.post('/download-batches', validateBody(downloadBatchesSchema), downloadBatches);

export default router;
