// src/services/notifications.js
// ─────────────────────────────────────────────────────────────
// FIXES APPLIED (original):
//
// FIX 1 — vibrationPattern [0, 500, 500, 500] rejected by notifee:
//   Fixed: changed to [500, 500]
//
// FIX 2 — Hyphenated UUID IDs silently dropped by Android AlarmManager:
//   Fixed: toNotifeeId() strips all hyphens before passing to notifee.
//
// FIX 3 — fullScreenAction causes silent crash without manifest entry:
//   Fixed: removed fullScreenAction entirely.
//
// FIX 4 — Past-timestamp alarms silently ignored by Android:
//   Fixed: skip any alarm where msUntil <= 0.
//
// NEW — TTS voice announcement:
//   When a dose alarm fires (foreground or background), speaks
//   "Time to take your <medicationName>, <dosage>" using react-native-tts.
//   speakMedicationReminder() is exported so index.js background handler
//   and missedDoseTimer.js can also trigger voice when needed.
// ─────────────────────────────────────────────────────────────

import notifee, {
  AndroidImportance,
  AndroidVisibility,
  TriggerType,
  AlarmType,
  EventType,
} from '@notifee/react-native';
import { Platform, PermissionsAndroid } from 'react-native';
import Tts from 'react-native-tts';
import { emitNotificationTap } from './notificationEvents';

// ── Channel IDs ───────────────────────────────────────────────
export const CHANNEL_REMINDERS = 'safedose-reminders';
export const CHANNEL_CAREGIVER  = 'safedose-caregiver';

// ── ID sanitiser ──────────────────────────────────────────────
const toNotifeeId = (doseLogId) => doseLogId.replace(/-/g, '');

// ── Valid vibration pattern ───────────────────────────────────
const VIBRATION_PATTERN = [500, 500];

// ── TTS: initialise once ──────────────────────────────────────
let ttsReady = false;

const initTts = async () => {
  if (ttsReady) return;
  try {
    await Tts.setDefaultRate(0.48);          // slightly slower — clearer for medical context
    await Tts.setDefaultPitch(1.0);
    await Tts.setDefaultLanguage('en-US');
    ttsReady = true;
    console.log('[TTS] Initialised');
  } catch (err) {
    console.warn('[TTS] Init failed:', err.message);
  }
};

// ── Speak a medication reminder ───────────────────────────────
// Called from: foreground notifee event (below), index.js background
// handler, and missedDoseTimer.js on dose miss.
export const speakMedicationReminder = async (medicationName, dosage) => {
  try {
    await initTts();
    // Stop any currently speaking utterance so alarms don't stack
    Tts.stop();
    const utterance = dosage
      ? `Time to take your ${medicationName}, ${dosage}`
      : `Time to take your ${medicationName}`;
    console.log('[TTS] Speaking:', utterance);
    Tts.speak(utterance);
  } catch (err) {
    console.warn('[TTS] speak failed:', err.message);
  }
};

// ── One-time setup ────────────────────────────────────────────
export const configurePushNotifications = async () => {
  // Initialise TTS early so the engine is ready when first alarm fires
  await initTts();

  await notifee.createChannel({
    id: CHANNEL_REMINDERS,
    name: 'SafeDose Medication Reminders',
    description: 'Alarms for medication reminders — do not disable',
    importance: AndroidImportance.HIGH,
    vibration: true,
    sound: 'default',
    visibility: AndroidVisibility.PUBLIC,
  });

  await notifee.createChannel({
    id: CHANNEL_CAREGIVER,
    name: 'SafeDose Caregiver Alerts',
    description: 'Missed dose alerts for caregivers',
    importance: AndroidImportance.HIGH,
    vibration: true,
    sound: 'default',
    visibility: AndroidVisibility.PUBLIC,
  });

  console.log('[Notifications] Channels ready');

  // ── Foreground event handler ─────────────────────────────────
  // When the app is OPEN and a DOSE_REMINDER notification fires or is
  // pressed, speak the voice reminder immediately.
  notifee.onForegroundEvent(({ type, detail }) => {
    console.log('[Notifications] Foreground event:', type, detail?.notification?.data?.type);

    const data = detail?.notification?.data;
    if (!data) return;

    // Speak when notification is DELIVERED (displayed) while app is open
    if (
      type === EventType.DELIVERED &&
      data.type === 'DOSE_REMINDER'
    ) {
      speakMedicationReminder(data.medicationName, data.dosage);
    }

    // Also emit tap event for navigation
    if (type === EventType.PRESS) {
      emitNotificationTap(data);
    }
  });
};

// ── Request notification permission ───────────────────────────
export const requestNotificationPermission = async () => {
  try {
    if (Platform.OS === 'ios') {
      const settings = await notifee.requestPermission();
      const granted = settings.authorizationStatus >= 1;
      console.log('[Notifications] iOS permission granted:', granted);
      return granted;
    }
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: 'Allow Medication Reminders',
          message: 'SafeDose needs permission to send medication reminders and missed dose alerts.',
          buttonPositive: 'Allow',
          buttonNegative: 'Not Now',
        },
      );
      const granted = result === PermissionsAndroid.RESULTS.GRANTED;
      console.log('[Notifications] POST_NOTIFICATIONS granted:', granted);
      return granted;
    }
    return true;
  } catch (err) {
    console.warn('[Notifications] Permission error:', err.message);
    return false;
  }
};

// ── Check / request SCHEDULE_EXACT_ALARM ──────────────────────
export const checkExactAlarmPermission = async () => {
  if (Platform.OS !== 'android' || Platform.Version < 31) return true;
  try {
    const settings = await notifee.getNotificationSettings();
    const exactAlarm = settings.android?.alarm;
    console.log('[Notifications] Exact alarm status:', exactAlarm);
    if (exactAlarm === 1) return true;
    console.log('[Notifications] Requesting exact alarm permission via system dialog...');
    await notifee.openAlarmPermissionSettings();
    return false;
  } catch (err) {
    console.warn('[Notifications] checkExactAlarmPermission error:', err.message);
    return false;
  }
};

// ── Schedule one dose alarm ───────────────────────────────────
export const scheduleDoseAlarm = async ({ doseLogId, medicationName, dosage, scheduledTime }) => {
  const fireDate = new Date(scheduledTime);
  const msUntil = fireDate.getTime() - Date.now();

  // FIX 4: Skip ANY past timestamp
  if (msUntil <= 0) {
    console.warn(
      `[Notifications] SKIPPED "${medicationName}" @ ${fireDate.toLocaleTimeString()} — already passed (${Math.round(msUntil / 1000)}s ago)`,
    );
    return;
  }

  // FIX 2: Strip hyphens
  const notifeeId = toNotifeeId(doseLogId);

  console.log(
    `[Notifications] Scheduling: "${medicationName}" at ${fireDate.toLocaleTimeString()} | in ${Math.round(msUntil / 1000)}s | notifeeId: ${notifeeId}`,
  );

  const trigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: fireDate.getTime(),
    alarmManager: {
      type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE,
    },
  };

  await notifee.createTriggerNotification(
    {
      id: notifeeId,
      title: '💊 Medication Reminder',
      body: `Time to take ${medicationName} – ${dosage}`,
      android: {
        channelId: CHANNEL_REMINDERS,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        pressAction: { id: 'default', launchActivity: 'default' },
        // FIX 1: valid positive-only vibration pattern
        vibrationPattern: VIBRATION_PATTERN,
        sound: 'default',
      },
      data: {
        type: 'DOSE_REMINDER',
        doseLogId,
        medicationName,
        dosage,
      },
    },
    trigger,
  );
};

// ── Cancel a dose alarm ───────────────────────────────────────
export const cancelDoseAlarm = async (doseLogId) => {
  const notifeeId = toNotifeeId(doseLogId);
  console.log('[Notifications] Cancelling alarm:', notifeeId);
  await notifee.cancelTriggerNotification(notifeeId);
};

export const cancelAllAlarmsForMedication = async (doseLogIds) => {
  await Promise.all(doseLogIds.map((id) => cancelDoseAlarm(id)));
};

// ── Immediate notification (missed dose shown on patient device) ──
export const showMissedDoseLocalAlert = async (info) => {
  console.log('[Notifications] Showing missed dose alert:', info.message);
  await notifee.displayNotification({
    title: '⚠️ Missed Dose',
    body: info.message,
    android: {
      channelId: CHANNEL_CAREGIVER,
      importance: AndroidImportance.HIGH,
      visibility: AndroidVisibility.PUBLIC,
      pressAction: { id: 'default', launchActivity: 'default' },
      vibrationPattern: VIBRATION_PATTERN,
      sound: 'default',
    },
    data: { type: 'MISSED_DOSE_ALERT', ...info },
  });
};

// ── Immediate test notification ───────────────────────────────
export const sendTestNotification = async () => {
  console.log('[Notifications] Sending immediate test notification');
  await notifee.displayNotification({
    title: '✅ SafeDose Test',
    body: 'Notifications are working correctly!',
    android: {
      channelId: CHANNEL_REMINDERS,
      importance: AndroidImportance.HIGH,
      pressAction: { id: 'default', launchActivity: 'default' },
    },
    data: { type: 'TEST' },
  });
};

// ── DEV: Schedule alarm 15 seconds from now ───────────────────
export const scheduleDoseAlarmIn15Seconds = async ({ doseLogId, medicationName, dosage }) => {
  const fireDate = new Date(Date.now() + 15 * 1000);
  console.log(`[Notifications] DEV: scheduling test alarm in 15s for "${medicationName}"`);
  await scheduleDoseAlarm({ doseLogId, medicationName, dosage, scheduledTime: fireDate });
};