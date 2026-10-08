import test from 'node:test';
import assert from 'node:assert/strict';
import { computeNextCheck, computeBackoff } from '../../src/utils/date.utils.js';

const t = (s) => new Date(s);
test('next = scheduled + interval (no drift)', () => {
  const next = computeNextCheck(t('2026-10-01T10:00:00Z'), 60, t('2026-10-01T10:00:07Z'));
  assert.equal(next.toISOString(), '2026-10-01T11:00:00.000Z');
});
test('after downtime skips to next future slot (no catch-up storm)', () => {
  const next = computeNextCheck(t('2026-10-01T10:00:00Z'), 60, t('2026-10-01T13:00:05Z'));
  assert.equal(next.toISOString(), '2026-10-01T14:00:00.000Z');
});
test('backoff doubles and caps at 8x', () => {
  const now = t('2026-10-01T00:00:00Z');
  assert.equal(computeBackoff(now, 15, 1).getTime() - now.getTime(), 15 * 60000);
  assert.equal(computeBackoff(now, 15, 3).getTime() - now.getTime(), 60 * 60000);
  assert.equal(computeBackoff(now, 15, 20).getTime() - now.getTime(), 120 * 60000);
});
