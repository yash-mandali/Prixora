import mongoose from 'mongoose';
import { PRICE_STATUSES } from '../constants/monitoring-types.js';

const schema = new mongoose.Schema({
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'MonitoringTask', required: true },
  executionId: { type: mongoose.Schema.Types.ObjectId, ref: 'MonitoringExecution' },
  checkedAt: { type: Date, required: true },
  price: { type: Number, required: true, min: 1 },
  currency: { type: String, default: 'INR' },
  previousPrice: Number,
  priceDifference: Number,
  percentageChange: Number,
  priceStatus: { type: String, enum: PRICE_STATUSES },
  productAvailability: String,
  errorMessage: String,
}, { timestamps: { createdAt: true, updatedAt: false } });

schema.index({ taskId: 1, checkedAt: -1 });
schema.index({ taskId: 1, price: 1 });

export const PriceHistory = mongoose.model('PriceHistory', schema);
