import { Router } from 'express';
import {
  scanProjectHandler,
  batchFiles,
  downloadBatch,
  downloadBatches,
} from '../modules/fileBatcher/controller';

const router = Router();

router.get('/scan', scanProjectHandler);
router.post('/batch', batchFiles);
router.post('/download', downloadBatch);
router.post('/download-batches', downloadBatches);

export default router;
