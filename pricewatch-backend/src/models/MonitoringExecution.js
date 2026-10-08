import mongoose from 'mongoose';
import { env } from '../config/environment.js';
import { EXECUTION_STATUS } from '../constants/task-status.js';

const schema = new mongoose.Schema({
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'MonitoringTask', required: true },
  workerId: String,
  attempt: Number,
  startedAt: { type: Date, required: true },
  completedAt: Date,
  status: { type: String, enum: Object.values(EXECUTION_STATUS), default: EXECUTION_STATUS.STARTED },
  price: Number,
  errorCode: String,
  errorMessage: String,
  executionDurationMs: Number,
  websiteDomain: String,
}, { timestamps: { createdAt: true, updatedAt: false } });

schema.index({ taskId: 1, startedAt: -1 });
// Execution logs expire; price history never does.
schema.index({ createdAt: 1 }, { expireAfterSeconds: env.EXECUTION_TTL_DAYS * 86400 });

export const MonitoringExecution = mongoose.model('MonitoringExecution', schema);
