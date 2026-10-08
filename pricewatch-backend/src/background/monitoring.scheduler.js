import os from 'node:os';
import crypto from 'node:crypto';
import { env } from '../config/environment.js';
import { logger } from '../utils/logger.js';
import { claimNextTask } from './task-claimer.js';
import { sweepLifecycle } from './lifecycle.sweeper.js';
import { executeTask } from './monitoring.worker.js';
import { playwrightService } from '../playwright/playwright.service.js';

/**
 * Polling scheduler. Only depends on two seams: claimNextTask() and executeTask(task).
 * Swap this file for a BullMQ producer/consumer later without touching business logic.
 */
export function createScheduler({ execute = executeTask, claim = claimNextTask } = {}) {
  const workerId = `${os.hostname()}-${process.pid}-${crypto.randomBytes(3).toString('hex')}`;
  const inflight = new Set();
  let timer = null;
  let ticking = false;
  let stopping = false;

  async function tick() {
    if (ticking || stopping) return;
    ticking = true;
    try {
      await sweepLifecycle();
      while (!stopping && inflight.size < env.MAX_CONCURRENT_JOBS) {
        const task = await claim(workerId, env.LEASE_MS);
        if (!task) break;
        const p = execute(task, { workerId }).catch((e) => logger.error({ err: e.message }, 'Unhandled job error')).finally(() => inflight.delete(p));
        inflight.add(p);
      }
    } catch (err) {
      logger.error({ err: err.message }, 'Scheduler tick failed');
    } finally {
      ticking = false;
    }
  }

  return {
    workerId,
    start() {
      logger.info({ workerId, maxConcurrent: env.MAX_CONCURRENT_JOBS, pollMs: env.WORKER_POLL_INTERVAL_MS }, 'Worker started');
      tick();
      timer = setInterval(tick, env.WORKER_POLL_INTERVAL_MS);
    },
    async stop(graceMs = 30000) {
      stopping = true;
      clearInterval(timer);
      await Promise.race([Promise.allSettled([...inflight]), new Promise((r) => setTimeout(r, graceMs))]);
      await playwrightService.closeBrowser();
      logger.info({ workerId }, 'Worker stopped');
    },
    tick, // exposed for tests
  };
}
