import { TASK_STATUS as S, EXECUTION_STATUS as X } from '../constants/task-status.js';
import { env } from '../config/environment.js';
import { monitoringRepository } from '../repositories/monitoring.repository.js';
import { priceHistoryRepository } from '../repositories/priceHistory.repository.js';
import { executionRepository } from '../repositories/execution.repository.js';
import { playwrightService } from '../playwright/playwright.service.js';
import { getExtractor } from '../playwright/extractor.factory.js';
import { evaluatePrice } from '../strategies/index.js';
import { notificationService } from '../services/notification.service.js';
import { computeNextCheck, computeBackoff } from '../utils/date.utils.js';
import { waitTurn } from '../utils/domain-throttle.js';
import { logger } from '../utils/logger.js';

/**
 * Executes ONE already-claimed task end to end. This is the job handler: a future BullMQ processor
 * can call it unchanged. It never throws, so one bad task cannot stop the worker (rule 4).
 */
export async function executeTask(task, { workerId, playwright = playwrightService, notifier = notificationService } = {}) {
  const startedAtMs = Date.now();
  let log = logger.child({ taskId: String(task._id), userId: String(task.userId), websiteDomain: task.websiteDomain, workerId });
  let execution;
  try {
    execution = await executionRepository.start({
      taskId: task._id, workerId, websiteDomain: task.websiteDomain, attempt: (task.consecutiveFailures || 0) + 1,
    });
    log = log.child({ executionId: String(execution._id) });
    const finish = (status, extra = {}) => executionRepository.finish(execution._id, { status, startedAtMs, ...extra });

    try {
      const now = new Date();
      if (task.status !== S.RUNNING || task.endDate < now) { await finish(X.SKIPPED, { errorCode: 'NOT_RUNNABLE' }); return; }

      log.info('Task started');
      await waitTurn(task.websiteDomain, env.DOMAIN_MIN_GAP_MS);
      const extractor = getExtractor(task.productUrl);
      const result = await playwright.withPage((page) => extractor.extract(page, task.productUrl), { timeoutMs: env.JOB_TIMEOUT_MS });
      log.info({ price: result.price }, 'Price extracted');

      // Re-verify: the user may have paused/cancelled/deleted while the page was loading.
      const fresh = await monitoringRepository.findById(task._id);
      if (!fresh || fresh.status !== S.RUNNING) { await finish(X.SKIPPED, { errorCode: 'TASK_NO_LONGER_RUNNING' }); return; }

      await recordSuccess({ task: fresh, result, execution, workerId, log, notifier });
      await finish(X.SUCCESS, { price: result.price });
    } catch (err) {
      const code = err.code && typeof err.code === 'string' ? err.code : 'UNEXPECTED_ERROR';
      log.warn({ code, err: err.message }, 'Task check failed');
      await finish(code === 'TIMEOUT' ? X.TIMEOUT : X.FAILED, { errorCode: code, errorMessage: String(err.message).slice(0, 300) }).catch(() => { });
      await recordFailure({ task, err, code, workerId, log }).catch((e) => log.error({ err: e.message }, 'Failed to record failure'));
    }
  } catch (outer) {
    log.error({ err: outer.message }, 'Execution bookkeeping failed');
  } finally {
    await monitoringRepository.releaseLease(task._id, workerId).catch((e) => log.error({ err: e.message }, 'Lease release failed'));
  }
}

async function recordSuccess({ task, result, execution, workerId, log, notifier }) {
  const now = new Date();
  const price = result.price;
  const previousPrice = task.lastKnownPrice ?? null;
  const evaluation = evaluatePrice({ task, price, previousPrice });
  const diff = previousPrice == null ? null : price - previousPrice;

  const history = await priceHistoryRepository.create({
    taskId: task._id, executionId: execution._id, checkedAt: now, price, currency: result.currency,
    previousPrice: previousPrice ?? undefined, priceDifference: diff ?? undefined,
    percentageChange: previousPrice ? Math.round((diff * 10000) / previousPrice) / 100 : undefined,
    priceStatus: evaluation.priceStatus, productAvailability: result.availability,
  });
  log.info({ historyId: String(history._id) }, 'Price history saved');

  const nextCheckAt = computeNextCheck(now, task.intervalMinutes, now);
  const set = {
    lastCheckedAt: now, lastAttemptAt: now, nextCheckAt, lastKnownPrice: price, currency: result.currency,
    productAvailability: result.availability, consecutiveFailures: 0, lastErrorCode: null, lastAlertState: evaluation.priceStatus,
    ...(result.productName && { productName: result.productName }),
    ...(result.imageUrl && { productImageUrl: result.imageUrl }),
  };
  await monitoringRepository.updateLeased(task._id, workerId, { $set: set, $min: { lowestPrice: price }, $max: { highestPrice: price } });

  if (nextCheckAt > task.endDate) { // that was the final check in the window
    await monitoringRepository.updateIfStatus(task._id, S.RUNNING, { status: S.COMPLETED, completedAt: now, terminalReason: 'EndDateReached' });
    log.info('Task completed');
  }

  if (evaluation.shouldNotify) {
    log.info({ priceStatus: evaluation.priceStatus }, 'Alert generated');
    await notifier.notifyPriceEvent({ task, history, price, previousPrice, evaluation }); // never throws
  }
}

async function recordFailure({ task, err, code, workerId, log }) {
  const now = new Date();
  const failures = (task.consecutiveFailures || 0) + 1;
  const nextCheckAt = computeBackoff(now, task.intervalMinutes, failures);
  await monitoringRepository.updateLeased(task._id, workerId, {
    $set: { lastAttemptAt: now, consecutiveFailures: failures, lastErrorCode: code, nextCheckAt },
  });
  if (err.permanent || failures >= env.MAX_CONSECUTIVE_FAILURES) {
    await monitoringRepository.updateIfStatus(task._id, S.RUNNING, {
      status: S.FAILED, completedAt: now, terminalReason: err.permanent ? code : 'TooManyConsecutiveFailures',
    });
    log.error({ code, failures }, 'Task failed permanently');
  } else if (nextCheckAt > task.endDate) {
    await monitoringRepository.updateIfStatus(task._id, S.RUNNING, { status: S.COMPLETED, completedAt: now, terminalReason: 'EndDateReached' });
  }
}
