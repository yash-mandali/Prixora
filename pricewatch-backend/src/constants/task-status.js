export const TASK_STATUS = Object.freeze({
  PENDING: 'Pending',
  RUNNING: 'Running',
  PAUSED: 'Paused',
  COMPLETED: 'Completed',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
  FAILED: 'Failed',
});
export const ALL_STATUSES = Object.values(TASK_STATUS);
export const TERMINAL_STATUSES = [TASK_STATUS.COMPLETED, TASK_STATUS.EXPIRED, TASK_STATUS.CANCELLED, TASK_STATUS.FAILED];
export const ACTIVE_STATUSES = [TASK_STATUS.PENDING, TASK_STATUS.RUNNING, TASK_STATUS.PAUSED];

// Single source of truth for legal lifecycle transitions.
const T = TASK_STATUS;
export const TRANSITIONS = Object.freeze({
  [T.PENDING]: [T.RUNNING, T.CANCELLED, T.EXPIRED],
  [T.RUNNING]: [T.PAUSED, T.COMPLETED, T.CANCELLED, T.FAILED],
  [T.PAUSED]: [T.RUNNING, T.CANCELLED, T.EXPIRED],
  [T.COMPLETED]: [], [T.EXPIRED]: [], [T.CANCELLED]: [], [T.FAILED]: [],
});
export const canTransition = (from, to) => (TRANSITIONS[from] || []).includes(to);

export const EXECUTION_STATUS = Object.freeze({
  STARTED: 'Started', SUCCESS: 'Success', FAILED: 'Failed', TIMEOUT: 'Timeout', SKIPPED: 'Skipped',
});
