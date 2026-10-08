import { monitoringRepository } from '../repositories/monitoring.repository.js';

/** Atomic claim of one due task (status Running, due, within window, lease free/expired). */
export const claimNextTask = (workerId, leaseMs, now = new Date()) => monitoringRepository.claimDue(workerId, leaseMs, now);
