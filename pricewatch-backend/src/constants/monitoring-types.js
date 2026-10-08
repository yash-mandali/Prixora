export const MONITORING_TYPE = Object.freeze({
  PRICE_RANGE: 'PriceRange',
  TARGET_PRICE: 'TargetPrice',
  PRICE_CHANGE: 'PriceChange',
  PERCENTAGE_DROP: 'PercentageDrop',
});
export const MONITORING_TYPES = Object.values(MONITORING_TYPE);

export const PRICE_STATUS = Object.freeze({
  BELOW_RANGE: 'BelowRange', IN_RANGE: 'InRange', ABOVE_RANGE: 'AboveRange',
  PRICE_CHANGED: 'PriceChanged', PRICE_UNCHANGED: 'PriceUnchanged',
  TARGET_REACHED: 'TargetReached', BELOW_TARGET: 'BelowTarget', ABOVE_TARGET: 'AboveTarget',
});
export const PRICE_STATUSES = Object.values(PRICE_STATUS);
