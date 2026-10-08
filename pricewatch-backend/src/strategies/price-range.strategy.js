import { PRICE_STATUS } from '../constants/monitoring-types.js';

/** Type 1: price relative to [minimumPrice, maximumPrice]. Alerts when the price ENTERS the range. */
export const priceRangeStrategy = {
  type: 'PriceRange',
  evaluate({ task, price }) {
    const { minimumPrice: min, maximumPrice: max } = task;
    let priceStatus = PRICE_STATUS.IN_RANGE;
    if (min != null && price < min) priceStatus = PRICE_STATUS.BELOW_RANGE;
    else if (max != null && price > max) priceStatus = PRICE_STATUS.ABOVE_RANGE;
    return { priceStatus, triggered: priceStatus === PRICE_STATUS.IN_RANGE, transitionOnly: true, headline: 'Price entered target range' };
  },
};
