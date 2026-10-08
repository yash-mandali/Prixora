import { env } from './config/environment.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { createApp } from './app.js';
import { createScheduler } from './background/monitoring.scheduler.js';
import { logger } from './utils/logger.js';

await connectDatabase();
const app = createApp();
const server = app.listen(env.PORT, () => logger.info({ port: env.PORT }, 'API listening'));

const scheduler = env.RUN_WORKER_IN_API ? createScheduler() : null;
scheduler?.start();

const shutdown = async (signal) => {
  logger.info({ signal }, 'Shutting down API');
  server.close();
  await scheduler?.stop();
  await disconnectDatabase();
  process.exit(0);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (e) => logger.error({ err: String(e) }, 'Unhandled rejection'));
