import mongoose from 'mongoose';
import { env } from './environment.js';
import { logger } from '../utils/logger.js';

export async function connectDatabase() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  // Build indexes (unique email, claim index, TTL, dedupeKey) before serving traffic.
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  logger.info('MongoDB connected');
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
