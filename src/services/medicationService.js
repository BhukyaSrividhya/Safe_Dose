// src/services/medicationService.js
import { v4 as uuid } from 'uuid';
import { format, setHours, setMinutes, startOfDay, endOfDay } from 'date-fns';
import {
  insertMedication,
  getMedicationsByUser,
  getMedicationById,
  updateMedication,
  softDeleteMedication,
  insertDoseLog,
  getDoseLogsByUser,
} from './database';
import { scheduleDoseAlarm, cancelDoseAlarm } from './notifications';
import { startMissedDoseTimer, cancelMissedDoseTimer } from './missedDoseTimer';
import { medicationsCol } from './firebase';
import { isOnline } from './syncService';

export const createMedication = async (userId, medData) => {
  const now = new Date().toISOString();
  const med = {
    id: uuid(),
    userId,
    name: medData.name.trim(),
    dosage: medData.dosage.trim(),
    times: medData.times,
    isCritical: medData.isCritical || false,
    pillCount: medData.pillCount || 0,
    createdAt: now,
    updatedAt: now,
  };

  // Step 1: Save to local SQLite — source of truth, must succeed
  await insertMedication(med);

  // Step 2: Schedule local alarms — must succeed
  await scheduleTodayDoses(med);

  // Step 3: Sync to Firestore — wrapped in try/catch so a network or
  // Firestore rules failure does NOT show "Error" to the user.
  // The medication is already saved locally and alarms are set.
  // syncService will retry when connectivity returns.
  try {
    if (await isOnline()) {
      await medicationsCol(userId).doc(med.id).set(med);
    }
  } catch (syncErr) {
    console.warn('[MedService] Firestore sync failed (will retry on next sync):', syncErr.message);
  }

  return med;
};

export const editMedication = async (userId, medId, updates) => {
  const existing = await getMedicationById(medId);
  if (!existing) throw new Error('Medication not found');
  const updated = {
    ...existing,
    name: updates.name.trim(),
    dosage: updates.dosage.trim(),
    times: updates.times,
    isCritical: updates.isCritical || false,
    pillCount: updates.pillCount || 0,
    updatedAt: new Date().toISOString(),
  };
  await updateMedication(updated);
  await scheduleTodayDoses(updated);
  try {
    if (await isOnline()) {
      await medicationsCol(userId).doc(medId).set(updated, { merge: true });
    }
  } catch (syncErr) {
    console.warn('[MedService] Firestore sync failed on edit (will retry):', syncErr.message);
  }
  return updated;
};

export const deleteMedication = async (userId, medId) => {
  const now = new Date().toISOString();
  await softDeleteMedication(medId, now);
  const todayLogs = await getDoseLogsByUser(
    userId,
    startOfDay(new Date()).toISOString(),
    endOfDay(new Date()).toISOString(),
  );
  for (const l of todayLogs.filter((l) => l.medicationId === medId && l.status === 'pending')) {
    await cancelDoseAlarm(l.id);
    cancelMissedDoseTimer(l.id);
  }
  try {
    if (await isOnline()) {
      await medicationsCol(userId).doc(medId).update({ active: false, updatedAt: now });
    }
  } catch (syncErr) {
    console.warn('[MedService] Firestore sync failed on delete (will retry):', syncErr.message);
  }
};

// ── Schedule today's doses ────────────────────────────────────
// Skips any dose time that has already passed — Android AlarmManager
// silently ignores past timestamps so there is no point registering them.
// scheduleDoseAlarm() also guards this, but we skip early here to avoid
// inserting a dose log for a time we cannot actually alarm for.
//
// Double-call safety (called from createMedication AND scheduleAllTodayDoses):
//  - insertDoseLog uses INSERT OR IGNORE — no duplicate rows
//  - notifee createTriggerNotification with same id overwrites the old trigger
//  - startMissedDoseTimer calls cancelMissedDoseTimer first — no duplicate timers

export const scheduleTodayDoses = async (med) => {
  console.log(`[MedService] scheduleTodayDoses: "${med.name}" | times: [${med.times.join(', ')}]`);

  for (const timeStr of med.times) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const scheduledTime = setMinutes(setHours(new Date(), hours), minutes);
    scheduledTime.setSeconds(0);
    scheduledTime.setMilliseconds(0);

    const msUntilAlarm = scheduledTime.getTime() - Date.now();

    // Skip past times — AlarmManager silently drops past timestamps
    if (msUntilAlarm <= 0) {
      console.warn(`[MedService] SKIPPED "${med.name}" @ ${timeStr} — time already passed`);
      continue;
    }

    const doseLogId = buildDoseLogId(med.id, scheduledTime);
    console.log(`[MedService] "${med.name}" @ ${timeStr} | fires in ${Math.round(msUntilAlarm / 1000)}s`);

    try {
      await insertDoseLog({
        id: doseLogId,
        medicationId: med.id,
        userId: med.userId,
        scheduledTime: scheduledTime.toISOString(),
        confirmedAt: null,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
    } catch (_) {
      // INSERT OR IGNORE — already exists from a previous call, that is fine
    }

    await scheduleDoseAlarm({
      doseLogId,
      medicationName: med.name,
      dosage: med.dosage,
      scheduledTime,
    });

    setTimeout(() => {
      startMissedDoseTimer({
        doseLogId,
        userId: med.userId,
        medicationId: med.id,
        scheduledTime: scheduledTime.toISOString(),
        isCritical: med.isCritical,
      });
    }, msUntilAlarm);
  }
};

export const scheduleAllTodayDoses = async (userId) => {
  const meds = await getMedicationsByUser(userId);
  console.log(`[MedService] scheduleAllTodayDoses: ${meds.length} med(s)`);
  for (const med of meds) await scheduleTodayDoses(med);
};

const buildDoseLogId = (medicationId, scheduledTime) =>
  `${medicationId}-${format(scheduledTime, 'yyyyMMdd-HHmm')}`;

export const getMedications = (userId) => getMedicationsByUser(userId);

export const getTodayDoseLogs = (userId) =>
  getDoseLogsByUser(userId, startOfDay(new Date()).toISOString(), endOfDay(new Date()).toISOString());

export const getDoseLogsRange = (userId, from, to) => getDoseLogsByUser(userId, from, to);