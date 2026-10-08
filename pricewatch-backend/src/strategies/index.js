import { priceRangeStrategy } from './price-range.strategy.js';
import { targetPriceStrategy } from './target-price.strategy.js';
import { priceChangeStrategy } from './price-change.strategy.js';
import { percentageDropStrategy } from './percentage-drop.strategy.js';

// Add a new monitoring mode = add a strategy file + register it here + add the type constant.
const registry = new Map([priceRangeStrategy, targetPriceStrategy, priceChangeStrategy, percentageDropStrategy].map((s) => [s.type, s]));

export function getStrategy(type) {
  const s = registry.get(type);
  if (!s) throw new Error(`No monitoring strategy registered for type "${type}"`);
  return s;
}

/**
 * Evaluate a price. Returns { priceStatus, triggered, shouldNotify, headline }.
 * shouldNotify de-duplicates: "transition" strategies alert only when the state changed since last check.
 */
export function evaluatePrice({ task, price, previousPrice }) {
  const r = getStrategy(task.monitoringType).evaluate({ task, price, previousPrice });
  const shouldNotify = r.triggered && (!r.transitionOnly || task.lastAlertState !== r.priceStatus);
  return { ...r, shouldNotify };
}
