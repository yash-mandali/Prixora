import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePrice } from '../../src/strategies/index.js';

const range = { monitoringType: 'PriceRange', minimumPrice: 6000000, maximumPrice: 7000000 };

test('range: below / in / above', () => {
  assert.equal(evaluatePrice({ task: range, price: 5999900 }).priceStatus, 'BelowRange');
  assert.equal(evaluatePrice({ task: range, price: 6500000 }).priceStatus, 'InRange');
  assert.equal(evaluatePrice({ task: range, price: 7000100 }).priceStatus, 'AboveRange');
});
test('range: boundaries are inclusive', () => {
  assert.equal(evaluatePrice({ task: range, price: 6000000 }).priceStatus, 'InRange');
  assert.equal(evaluatePrice({ task: range, price: 7000000 }).priceStatus, 'InRange');
});
test('range: alerts only on transition into range (dedupe)', () => {
  assert.equal(evaluatePrice({ task: { ...range, lastAlertState: 'AboveRange' }, price: 6500000 }).shouldNotify, true);
  assert.equal(evaluatePrice({ task: { ...range, lastAlertState: 'InRange' }, price: 6400000 }).shouldNotify, false);
});
test('target price reached / not reached', () => {
  const t = { monitoringType: 'TargetPrice', targetPrice: 6000000 };
  assert.equal(evaluatePrice({ task: t, price: 6000000 }).priceStatus, 'TargetReached');
  assert.equal(evaluatePrice({ task: t, price: 6000100 }).priceStatus, 'AboveTarget');
  assert.equal(evaluatePrice({ task: t, price: 5000000 }).shouldNotify, true);
});
test('price change: unchanged / increased / decreased', () => {
  const t = { monitoringType: 'PriceChange' };
  assert.equal(evaluatePrice({ task: t, price: 100, previousPrice: 100 }).shouldNotify, false);
  assert.equal(evaluatePrice({ task: t, price: 120, previousPrice: 100 }).shouldNotify, true);
  assert.equal(evaluatePrice({ task: t, price: 80, previousPrice: 100 }).headline, 'Price dropped');
  assert.equal(evaluatePrice({ task: t, price: 80 }).shouldNotify, false); // first check never alerts
});
test('percentage drop threshold', () => {
  const t = { monitoringType: 'PercentageDrop', percentageThreshold: 10 };
  assert.equal(evaluatePrice({ task: t, price: 9000, previousPrice: 10000 }).shouldNotify, true);   // exactly 10%
  assert.equal(evaluatePrice({ task: t, price: 9100, previousPrice: 10000 }).shouldNotify, false);
  assert.equal(evaluatePrice({ task: t, price: 11000, previousPrice: 10000 }).shouldNotify, false);
});
