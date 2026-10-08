import { PRICE_STATUS } from '../constants/monitoring-types.js';

/** Type 4: notify when price dropped by >= percentageThreshold vs the previous recorded price. */
export const percentageDropStrategy = {
  type: 'PercentageDrop',
  evaluate({ task, price, previousPrice }) {
    const dropPct = previousPrice ? ((previousPrice - price) * 100) / previousPrice : 0;
    const triggered = previousPrice != null && task.percentageThreshold != null && dropPct >= task.percentageThreshold;
    return {
      priceStatus: previousPrice != null && price !== previousPrice ? PRICE_STATUS.PRICE_CHANGED : PRICE_STATUS.PRICE_UNCHANGED,
      triggered, transitionOnly: false, headline: `Price dropped ${dropPct.toFixed(1)}%`,
    };
  },
};
