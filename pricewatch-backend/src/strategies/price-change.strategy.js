import { PRICE_STATUS } from '../constants/monitoring-types.js';

/** Type 3: notify whenever price differs from the previous recorded price. */
export const priceChangeStrategy = {
  type: 'PriceChange',
  evaluate({ price, previousPrice }) {
    const changed = previousPrice != null && price !== previousPrice;
    return {
      priceStatus: changed ? PRICE_STATUS.PRICE_CHANGED : PRICE_STATUS.PRICE_UNCHANGED,
      triggered: changed, transitionOnly: false,
      headline: previousPrice != null && price < previousPrice ? 'Price dropped' : 'Price changed',
    };
  },
};
