// src/services/doseConfirmationService.js
import { updateDoseLogStatus, getDoseLogById } from './database';
import { cancelDoseAlarm } from './notifications';
import { cancelMissedDoseTimer } from './missedDoseTimer';
import { syncNow } from './syncService';
import { parseISO, differenceInMinutes } from 'date-fns';

export const confirmDose = async (doseLogId, userId) => {
  const log = await getDoseLogById(doseLogId);
  if (!log) throw new Error('Dose log not found');
  if (log.status !== 'pending') throw new Error('Dose already confirmed or missed');

  const confirmedAt = new Date().toISOString();
  const minutesLate = differenceInMinutes(new Date(confirmedAt), parseISO(log.scheduledTime));
  const status = minutesLate > 30 ? 'late' : 'taken';

  await updateDoseLogStatus(doseLogId, status, confirmedAt);

  // Both are now async (notifee-based)
  await cancelDoseAlarm(doseLogId);
  cancelMissedDoseTimer(doseLogId);

  await syncNow(userId);
  return { status, confirmedAt, minutesLate };
};

export const undoConfirmation = async (doseLogId, userId, isCritical) => {
  const log = await getDoseLogById(doseLogId);
  if (!log) throw new Error('Dose log not found');

  await updateDoseLogStatus(doseLogId, 'pending', null);

  const { startMissedDoseTimer } = require('./missedDoseTimer');
  startMissedDoseTimer({
    doseLogId,
    userId,
    medicationId: log.medicationId,
    scheduledTime: log.scheduledTime,
    isCritical,
  });

  await syncNow(userId);
};