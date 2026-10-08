import { env } from '../config/environment.js';
import { AppError } from '../errors/app-error.js';
import { TASK_STATUS as S, ACTIVE_STATUSES } from '../constants/task-status.js';
import { monitoringRepository as repo } from '../repositories/monitoring.repository.js';
import { priceHistoryRepository } from '../repositories/priceHistory.repository.js';
import { executionRepository } from '../repositories/execution.repository.js';
import { notificationRepository } from '../repositories/notification.repository.js';
import { getExtractor } from '../playwright/extractor.factory.js';
import { ExtractionError } from '../playwright/errors.js';
import { assertSafeUrl, normalizeDomain } from '../utils/url.utils.js';
import { toMinor } from '../utils/money.js';
import { statisticsService } from './statistics.service.js';
import { taskDTO, historyDTO, executionDTO } from '../dto/index.js';
import { logger } from '../utils/logger.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function requireOwned(userId, id) {
  const task = await repo.findOwned(id, userId);
  if (!task) throw AppError.notFound('Monitoring task not found'); // 404 also for "not yours"
  return task;
}

async function assertSupported(url) {
  await assertSafeUrl(url);
  try { getExtractor(url); } catch (e) {
    if (e instanceof ExtractionError) throw AppError.unprocessable('This website is not supported yet', 'UNSUPPORTED_SITE');
    throw e;
  }
}

function toDoc(input) {
  return {
    productUrl: input.productUrl,
    websiteDomain: normalizeDomain(input.productUrl),
    monitoringType: input.monitoringType,
    minimumPrice: toMinor(input.minimumPrice),
    maximumPrice: toMinor(input.maximumPrice),
    targetPrice: toMinor(input.targetPrice),
    percentageThreshold: input.percentageThreshold,
    intervalMinutes: input.intervalMinutes,
    startDate: input.startDate,
    endDate: input.endDate,
    notificationPreference: input.notificationPreference,
  };
}

async function transition(userId, id, { from, to, extra = {}, unsetLock = false }) {
  const updated = await repo.updateOwned(id, userId, { status: { $in: from } }, {
    $set: { status: to, ...extra, ...(unsetLock && { lockedUntil: null, lockedBy: null }) },
  });
  if (updated) return updated;
  await requireOwned(userId, id); // 404 if missing/not owned
  throw AppError.conflict(`Cannot move a task to ${to} from its current state`, 'INVALID_TRANSITION');
}

export const monitoringService = {
  async create(userId, input) {
    if ((await repo.countActive(userId)) >= env.MAX_TASKS_PER_USER) {
      throw AppError.unprocessable(`You can have at most ${env.MAX_TASKS_PER_USER} active monitors`, 'TASK_LIMIT_REACHED');
    }
    await assertSupported(input.productUrl);
    const now = new Date();
    const task = await repo.create({
      userId, ...toDoc(input),
      status: input.startDate <= now ? S.RUNNING : S.PENDING,
      nextCheckAt: input.startDate <= now ? now : input.startDate,
    });
    logger.info({ taskId: String(task._id), userId: String(userId), websiteDomain: task.websiteDomain }, 'Task created');
    return taskDTO(task);
  },

  async list(userId, { page, limit, status, q, sortBy, sortDir }) {
    const filter = {};
    if (status?.length) filter.status = { $in: status };
    if (q) { const rx = new RegExp(escapeRegex(q), 'i'); filter.$or = [{ productName: rx }, { productUrl: rx }, { websiteDomain: rx }]; }
    const { items, total } = await repo.list(userId, { filter, page, limit, sort: { [sortBy]: sortDir === 'asc' ? 1 : -1, _id: -1 } });
    return { items: items.map(taskDTO), total };
  },

  async get(userId, id) { return taskDTO(await requireOwned(userId, id)); },

  async update(userId, id, input) {
    const task = await requireOwned(userId, id);
    if (![S.PENDING, S.PAUSED].includes(task.status)) {
      throw AppError.conflict('Only Pending or Paused monitors can be edited. Pause the monitor first.', 'NOT_EDITABLE');
    }
    const urlChanged = input.productUrl !== task.productUrl;
    if (urlChanged) await assertSupported(input.productUrl);
    const now = new Date();
    const set = { ...toDoc(input) };
    const unset = {};
    for (const k of ['minimumPrice', 'maximumPrice', 'targetPrice', 'percentageThreshold']) if (set[k] === undefined) { delete set[k]; unset[k] = ''; }
    set.nextCheckAt = task.status === S.PENDING ? input.startDate : new Date(Math.max(now.getTime(), task.nextCheckAt?.getTime() || 0));
    if (urlChanged) { // a new product: previous stats no longer apply
      Object.assign(unset, { productName: '', productImageUrl: '', lastKnownPrice: '', lowestPrice: '', highestPrice: '', lastAlertState: '', lastCheckedAt: '', lastErrorCode: '' });
      set.consecutiveFailures = 0;
    }
    const updated = await repo.updateOwned(id, userId, { status: { $in: [S.PENDING, S.PAUSED] } }, { $set: set, ...(Object.keys(unset).length && { $unset: unset }) });
    if (!updated) throw AppError.conflict('Monitor changed state while editing; please retry', 'INVALID_TRANSITION');
    return taskDTO(updated);
  },

  async pause(userId, id) {
    const t = await transition(userId, id, { from: [S.RUNNING], to: S.PAUSED });
    logger.info({ taskId: id, userId: String(userId) }, 'Task paused');
    return taskDTO(t);
  },

  async resume(userId, id) {
    const task = await requireOwned(userId, id);
    const nextCheckAt = new Date(Math.max(Date.now(), task.nextCheckAt?.getTime() || 0)); // no catch-up burst
    const t = await transition(userId, id, { from: [S.PAUSED], to: S.RUNNING, extra: { nextCheckAt, consecutiveFailures: 0 } });
    logger.info({ taskId: id, userId: String(userId) }, 'Task resumed');
    return taskDTO(t);
  },

  async cancel(userId, id) {
    const t = await transition(userId, id, {
      from: ACTIVE_STATUSES, to: S.CANCELLED, unsetLock: true, extra: { completedAt: new Date(), terminalReason: 'CancelledByUser' },
    });
    logger.info({ taskId: id, userId: String(userId) }, 'Task cancelled');
    return taskDTO(t);
  },

  async remove(userId, id) {
    const t = await repo.deleteOwned(id, userId);
    if (!t) throw AppError.notFound('Monitoring task not found');
    await Promise.all([priceHistoryRepository.deleteByTask(t._id), executionRepository.deleteByTask(t._id), notificationRepository.deleteByTask(t._id)]);
    logger.info({ taskId: id, userId: String(userId) }, 'Task deleted');
  },

  async history(userId, id, q) {
    const task = await requireOwned(userId, id);
    if (q.downsample) {
      const series = await priceHistoryRepository.series(task._id, q);
      const n = q.downsample;
      let picked = series;
      if (series.length > n) {
        const step = (series.length - 1) / (n - 1);
        picked = Array.from({ length: n }, (_, i) => series[Math.round(i * step)]);
      }
      return { items: picked.map(historyDTO), total: series.length };
    }
    const { items, total } = await priceHistoryRepository.list(task._id, { ...q, sortDir: q.sortDir === 'asc' ? 1 : -1 });
    return { items: items.map(historyDTO), total };
  },

  async latestPrice(userId, id) {
    const task = await requireOwned(userId, id);
    const h = await priceHistoryRepository.latest(task._id);
    return h ? historyDTO(h) : null;
  },

  async statistics(userId, id) { return statisticsService.forTask(await requireOwned(userId, id)); },

  async executions(userId, id, q) {
    const task = await requireOwned(userId, id);
    const { items, total } = await executionRepository.list(task._id, q);
    return { items: items.map(executionDTO), total };
  },

  async execution(userId, id, executionId) {
    const task = await requireOwned(userId, id);
    const e = await executionRepository.findOwnedByTask(task._id, executionId);
    if (!e) throw AppError.notFound('Execution not found');
    return executionDTO(e);
  },
};
