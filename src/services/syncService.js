// src/services/syncService.js
import NetInfo from '@react-native-community/netinfo';
import {
  getUnsynedDoseLogs,
  markDoseLogSynced,
  getPendingAlerts,
  markAlertSent,
} from './database';
import { doseLogsCol, alertsCol, firestore } from './firebase';

let syncTimer = null;
let unsubscribeNetInfo = null;

export const startSyncListener = (userId) => {
  stopSyncListener();
  unsubscribeNetInfo = NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable) {
      syncNow(userId);
    }
  });
};

export const stopSyncListener = () => {
  if (unsubscribeNetInfo) { unsubscribeNetInfo(); unsubscribeNetInfo = null; }
  if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; }
};

export const syncNow = async (userId) => {
  try {
    await syncDoseLogs(userId);
    await syncPendingAlerts(userId);
  } catch (err) {
    // Silently retry — do not crash the app if DB isn't ready yet
    console.warn('[SyncService] Sync failed, retrying in 5 min:', err.message);
    syncTimer = setTimeout(() => syncNow(userId), 5 * 60 * 1000);
  }
};

const syncDoseLogs = async (userId) => {
  const unsyncedLogs = await getUnsynedDoseLogs(userId);
  if (unsyncedLogs.length === 0) return;

  const batch = firestore().batch();
  const col = doseLogsCol(userId);
  for (const log of unsyncedLogs) {
    batch.set(
      col.doc(log.id),
      {
        medicationId: log.medicationId,
        scheduledTime: log.scheduledTime,
        confirmedAt: log.confirmedAt || null,
        status: log.status,
        createdAt: log.createdAt,
        syncedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  }
  await batch.commit();
  for (const log of unsyncedLogs) {
    await markDoseLogSynced(log.id);
  }
};

const syncPendingAlerts = async (userId) => {
  const pending = await getPendingAlerts(userId);
  if (pending.length === 0) return;

  const col = alertsCol(userId);
  const sentAt = new Date().toISOString();
  await col.add({
    type: 'MISSED_DOSE_BATCH',
    alerts: pending.map((a) => ({
      medicationId: a.medicationId,
      scheduledTime: a.scheduledTime,
    })),
    count: pending.length,
    createdAt: sentAt,
    status: 'pending',
  });
  for (const alert of pending) {
    await markAlertSent(alert.id, sentAt);
  }
};

export const isOnline = async () => {
  const state = await NetInfo.fetch();
  return !!(state.isConnected && state.isInternetReachable);
};
