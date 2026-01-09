import express from 'express';
import dotenv from 'dotenv';
import logger from './shared/logger';

dotenv.config();

const app = express();
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  logger.info(`Code Batcher backend running on port ${PORT}`);
});
