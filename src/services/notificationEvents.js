// src/services/notificationEvents.js
// Simple event emitter to decouple notification taps from navigation
import { EventEmitter } from 'events';

const emitter = new EventEmitter();

export const NOTIFICATION_TAP = 'NOTIFICATION_TAP';

export const emitNotificationTap = (data) => {
  emitter.emit(NOTIFICATION_TAP, data);
};

export const onNotificationTap = (callback) => {
  emitter.on(NOTIFICATION_TAP, callback);
  return () => emitter.off(NOTIFICATION_TAP, callback);
};
