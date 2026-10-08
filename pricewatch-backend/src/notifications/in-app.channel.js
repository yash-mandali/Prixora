import { CHANNEL } from '../constants/notification-types.js';

/** In-app: the persisted Notification document IS the delivery. */
export const inAppChannel = {
  type: CHANNEL.IN_APP,
  async deliver() { /* nothing further to do */ },
};
