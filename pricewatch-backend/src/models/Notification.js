import mongoose from 'mongoose';
import { CHANNELS, NOTIFICATION_STATUS } from '../constants/notification-types.js';

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'MonitoringTask', required: true },
  priceHistoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'PriceHistory' },
  notificationType: { type: String, enum: CHANNELS, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  sentAt: Date,
  status: { type: String, enum: Object.values(NOTIFICATION_STATUS), default: NOTIFICATION_STATUS.PENDING },
  errorMessage: String,
  dedupeKey: { type: String, required: true, unique: true }, // idempotent creation on retries
}, { timestamps: { createdAt: true, updatedAt: false } });

schema.index({ userId: 1, createdAt: -1 });
schema.index({ userId: 1, isRead: 1 });
schema.index({ taskId: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', schema);
