import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, TERMINAL_STATUSES } from '../../src/constants/task-status.js';

test('legal transitions', () => {
  assert.ok(canTransition('Pending', 'Running'));
  assert.ok(canTransition('Running', 'Paused'));
  assert.ok(canTransition('Paused', 'Running'));
  assert.ok(canTransition('Running', 'Completed'));
});
test('terminal states never transition (cancelled never runs again)', () => {
  for (const s of TERMINAL_STATUSES) for (const to of ['Running', 'Paused', 'Pending']) assert.equal(canTransition(s, to), false);
});
test('paused cannot complete directly', () => assert.equal(canTransition('Paused', 'Completed'), false));
