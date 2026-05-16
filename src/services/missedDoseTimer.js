// src/services/missedDoseTimer.js
import { v4 as uuid } from 'uuid';
import {
  updateDoseLogStatus,
  insertPendingAlert,
  getDoseLogById,
  getMedicationById,
} from './database';
import { syncNow } from './syncService';
import { showMissedDoseLocalAlert } from './notifications';

const activeTimers = new Map();

export const startMissedDoseTimer = ({
  doseLogId,
  userId,
  medicationId,
  scheduledTime,
  isCritical,
}) => {
  cancelMissedDoseTimer(doseLogId);

  const timeoutMs = isCritical ? 5 * 60 * 1000 : 30 * 60 * 1000;

  console.log(
    `[MissedDoseTimer] Armed: ${doseLogId} | fires in ${timeoutMs / 60000} min | critical: ${isCritical}`,
  );

  const handle = setTimeout(async () => {
    await handleMissedDose({ doseLogId, userId, medicationId, scheduledTime });
    activeTimers.delete(doseLogId);
  }, timeoutMs);

  activeTimers.set(doseLogId, handle);
};

export const cancelMissedDoseTimer = (doseLogId) => {
  if (activeTimers.has(doseLogId)) {
    clearTimeout(activeTimers.get(doseLogId));
    activeTimers.delete(doseLogId);
    console.log('[MissedDoseTimer] Cancelled:', doseLogId);
  }
};

const handleMissedDose = async ({ doseLogId, userId, medicationId, scheduledTime }) => {
  try {
    const log = await getDoseLogById(doseLogId);
    if (!log || log.status !== 'pending') return;

    console.log('[MissedDoseTimer] Marking missed:', doseLogId);
    await updateDoseLogStatus(doseLogId, 'missed', null);

    let medName = 'your medication';
    try {
      const med = await getMedicationById(medicationId);
      if (med?.name) medName = med.name;
    } catch (_) {}

    // Show local notification on patient's device — await since notifee is async
    await showMissedDoseLocalAlert({
      message: `You missed your ${medName} dose scheduled for ${new Date(scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      doseLogId,
      medicationId,
    });

    await insertPendingAlert({
      id: uuid(),
      userId,
      doseLogId,
      medicationId,
      scheduledTime,
      createdAt: new Date().toISOString(),
    });

    await syncNow(userId);
  } catch (err) {
    console.warn('[MissedDoseTimer] Error:', err.message);
  }
};

export const clearAllTimers = () => {
  activeTimers.forEach((handle) => clearTimeout(handle));
  activeTimers.clear();
};

export const activeTimerCount = () => activeTimers.size;