import { PRICE_STATUS } from '../constants/monitoring-types.js';

/** Type 2: notify when price <= targetPrice (on transition). */
export const targetPriceStrategy = {
  type: 'TargetPrice',
  evaluate({ task, price }) {
    const reached = task.targetPrice != null && price <= task.targetPrice;
    return {
      priceStatus: reached ? PRICE_STATUS.TARGET_REACHED : PRICE_STATUS.ABOVE_TARGET,
      triggered: reached, transitionOnly: true, headline: 'Price reached your target',
    };
  },
};
