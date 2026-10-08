import { connectDatabase, disconnectDatabase } from './config/database.js';
import { createScheduler } from './background/monitoring.scheduler.js';
import { logger } from './utils/logger.js';
import './models/index.js';

await connectDatabase();
const scheduler = createScheduler();
scheduler.start();

const shutdown = async (signal) => {
  logger.info({ signal }, 'Shutting down worker');
  await scheduler.stop();
  await disconnectDatabase();
  process.exit(0);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (e) => logger.error({ err: String(e) }, 'Unhandled rejection'));
