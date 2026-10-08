import { MonitoringExecution } from '../models/MonitoringExecution.js';

export const executionRepository = {
  start: (data) => MonitoringExecution.create({ ...data, startedAt: new Date(), status: 'Started' }),
  finish(id, { status, price, errorCode, errorMessage, startedAtMs }) {
    return MonitoringExecution.updateOne({ _id: id }, { $set: {
      status, price, errorCode, errorMessage, completedAt: new Date(), executionDurationMs: Date.now() - startedAtMs,
    } });
  },
  findOwnedByTask: (taskId, executionId) => MonitoringExecution.findOne({ _id: executionId, taskId }),
  deleteByTask: (taskId) => MonitoringExecution.deleteMany({ taskId }),
  async list(taskId, { page = 1, limit = 25 }) {
    const [items, total] = await Promise.all([
      MonitoringExecution.find({ taskId }).sort({ startedAt: -1 }).skip((page - 1) * limit).limit(limit),
      MonitoringExecution.countDocuments({ taskId }),
    ]);
    return { items, total };
  },
};
