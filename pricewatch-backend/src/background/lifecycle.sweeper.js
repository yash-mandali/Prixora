import { MonitoringTask } from '../models/MonitoringTask.js';
import { TASK_STATUS as S } from '../constants/task-status.js';
import { logger } from '../utils/logger.js';

/**
 * Independent of claiming, so end dates are honoured even for tasks nobody picks up (rule 10):
 *  Pending  + startDate reached            -> Running
 *  Running  + endDate passed (not leased)  -> Completed
 *  Pending/Paused + endDate passed         -> Expired
 */
export async function sweepLifecycle(now = new Date()) {
  const expired = await MonitoringTask.updateMany(
    { status: { $in: [S.PENDING, S.PAUSED] }, endDate: { $lt: now } },
    { $set: { status: S.EXPIRED, completedAt: now, terminalReason: 'EndDatePassedWhileInactive' } },
  );
  const completed = await MonitoringTask.updateMany(
    { status: S.RUNNING, endDate: { $lt: now }, $or: [{ lockedUntil: null }, { lockedUntil: { $lt: now } }] },
    { $set: { status: S.COMPLETED, completedAt: now, terminalReason: 'EndDateReached', lockedBy: null, lockedUntil: null } },
  );
  const activated = await MonitoringTask.updateMany(
    { status: S.PENDING, startDate: { $lte: now }, endDate: { $gte: now } },
    { $set: { status: S.RUNNING } },
  );
  const n = { activated: activated.modifiedCount, completed: completed.modifiedCount, expired: expired.modifiedCount };
  if (n.activated || n.completed || n.expired) logger.info(n, 'Lifecycle sweep applied');
  return n;
}
