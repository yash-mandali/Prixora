export const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60000);

/**
 * Next check is derived from the *scheduled* time (no drift). If the system was down and the
 * result is already in the past, skip forward to the next future slot (no catch-up storm).
 */
export function computeNextCheck(scheduledAt, intervalMinutes, now = new Date()) {
  const step = intervalMinutes * 60000;
  let next = scheduledAt.getTime() + step;
  if (next <= now.getTime()) next += (Math.floor((now.getTime() - next) / step) + 1) * step;
  return new Date(next);
}

/** Backoff after a failed check: interval * 2^(failures-1), capped at 8x interval. */
export function computeBackoff(now, intervalMinutes, failures) {
  const factor = Math.min(2 ** Math.max(failures - 1, 0), 8);
  return addMinutes(now, intervalMinutes * factor);
}
