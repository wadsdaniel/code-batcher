import express from 'express';
import dotenv from 'dotenv';
import { httpLogger, logger } from './shared/logger';
import routes from './routes';
import { globalErrorHandler } from './shared/http/errorHandler';

dotenv.config();

const app = express();
app.use(express.json());
app.use(httpLogger); // log all incoming requests

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// All routes
app.use('/api', routes);

// AFTER all routes
app.use(globalErrorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`Code Batcher backend running on port ${PORT}`);
});
