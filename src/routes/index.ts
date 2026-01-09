import express from 'express';
import fileBatcherRoutes from './fileBatcher';

const router = express.Router();

// Mount fileBatcher module
router.use('/fileBatcher', fileBatcherRoutes);

export default router;
