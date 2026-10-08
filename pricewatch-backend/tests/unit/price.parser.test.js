import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePrice } from '../../src/playwright/price.parser.js';

test('Indian grouping', () => assert.deepEqual(parsePrice('₹1,29,999.00'), { minor: 12999900, currency: 'INR' }));
test('Rs prefix', () => assert.equal(parsePrice('Rs. 999').minor, 99900));
test('USD', () => assert.deepEqual(parsePrice('$1,299.50'), { minor: 129950, currency: 'USD' }));
test('European format', () => assert.deepEqual(parsePrice('1.299,50 €'), { minor: 129950, currency: 'EUR' }));
test('plain number', () => assert.equal(parsePrice('69999').minor, 6999900));
test('uses the first displayed amount instead of concatenating multiple prices', () => {
  assert.deepEqual(parsePrice('₹69,999 ₹79,999'), { minor: 6999900, currency: 'INR' });
});
test('ignores a discount percentage before the currency-marked price', () => {
  assert.deepEqual(parsePrice('20% off ₹69,999'), { minor: 6999900, currency: 'INR' });
});
test('handles dot-grouped whole amounts', () => assert.equal(parsePrice('₹1.299').minor, 129900));
test('rejects garbage / zero / negative-ish', () => {
  assert.equal(parsePrice('Currently unavailable'), null);
  assert.equal(parsePrice('0'), null);
  assert.equal(parsePrice('-₹999'), null);
  assert.equal(parsePrice(''), null);
  assert.equal(parsePrice(null), null);
});
