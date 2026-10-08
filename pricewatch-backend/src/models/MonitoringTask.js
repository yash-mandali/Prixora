import mongoose from 'mongoose';
import { ALL_STATUSES, TASK_STATUS } from '../constants/task-status.js';
import { MONITORING_TYPES } from '../constants/monitoring-types.js';

// NOTE: all prices are integer minor units (paise/cents). lowestPrice/highestPrice deliberately
// have NO default so that $min/$max update operators initialise them correctly.
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  productUrl: { type: String, required: true, maxlength: 2048 },
  productName: { type: String, maxlength: 500 },
  productImageUrl: { type: String, maxlength: 2048 },
  websiteDomain: { type: String, required: true },
  monitoringType: { type: String, enum: MONITORING_TYPES, required: true },
  minimumPrice: { type: Number, min: 0 },
  maximumPrice: { type: Number, min: 0 },
  targetPrice: { type: Number, min: 0 },
  percentageThreshold: { type: Number, min: 0, max: 100 },
  intervalMinutes: { type: Number, required: true, min: 1 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ALL_STATUSES, default: TASK_STATUS.PENDING },
  lastCheckedAt: Date,       // last SUCCESSFUL check
  lastAttemptAt: Date,       // last attempt (success or failure)
  nextCheckAt: Date,
  lastKnownPrice: Number,
  lowestPrice: Number,
  highestPrice: Number,
  currency: { type: String, default: 'INR' },
  productAvailability: { type: String, default: 'Unknown' },
  notificationPreference: {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
  },
  lastAlertState: String,
  consecutiveFailures: { type: Number, default: 0 },
  lastErrorCode: String,
  lockedBy: String,
  lockedUntil: Date,
  completedAt: Date,
  terminalReason: String,
}, { timestamps: true });

schema.index({ status: 1, nextCheckAt: 1, lockedUntil: 1 });   // atomic claim query
schema.index({ userId: 1, createdAt: -1 });
schema.index({ userId: 1, status: 1 });
schema.index({ websiteDomain: 1 });
schema.index({ endDate: 1, status: 1 });                       // lifecycle sweep

export const MonitoringTask = mongoose.model('MonitoringTask', schema);
