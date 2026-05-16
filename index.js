// index.js
import 'react-native-get-random-values';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import messaging from '@react-native-firebase/messaging';
import notifee, { EventType } from '@notifee/react-native';
import { scheduleAllTodayDoses } from './src/services/medicationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RESCHEDULE_TASK_NAME } from './src/utils/BootReceiver';
import { emitNotificationTap } from './src/services/notificationEvents';
import { CHANNEL_CAREGIVER, speakMedicationReminder } from './src/services/notifications';

AppRegistry.registerComponent(appName, () => App);

// ── FCM background message handler ───────────────────────────
// Registered ONLY here in index.js — the JS entry point.
// Do NOT register this again in App.js.
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('[FCM Background]', remoteMessage.data?.type);
  if (remoteMessage.data?.type === 'CAREGIVER_MISSED_DOSE') {
    await notifee.displayNotification({
      title: remoteMessage.notification?.title || '⚠️ Missed Dose Alert',
      body: remoteMessage.notification?.body || 'Your patient missed a dose.',
      android: {
        channelId: CHANNEL_CAREGIVER,
        importance: 4,
        pressAction: { id: 'default', launchActivity: 'default' },
      },
      data: remoteMessage.data,
    });
  }
});

// ── Notifee background event handler ─────────────────────────
// Registered ONLY here in index.js.
// Handles DOSE_REMINDER alarms that fire while the app is backgrounded:
//   - DELIVERED → speak the voice reminder
//   - PRESS     → route tap to navigator via emitNotificationTap
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const data = detail?.notification?.data;

  // Voice announcement when alarm fires in background
  if (
    type === EventType.DELIVERED &&
    data?.type === 'DOSE_REMINDER'
  ) {
    await speakMedicationReminder(data.medicationName, data.dosage);
  }

  // Navigation routing on tap
  if (type === EventType.PRESS && data) {
    emitNotificationTap(data);
  }
});

// ── Headless Task: reschedule alarms after device reboot ──────
AppRegistry.registerHeadlessTask(RESCHEDULE_TASK_NAME, () => async () => {
  console.log('[BootTask] Rescheduling alarms after reboot...');
  try {
    const userId = await AsyncStorage.getItem('@safedose_userId');
    if (!userId) return;
    await scheduleAllTodayDoses(userId);
    console.log('[BootTask] Done.');
  } catch (err) {
    console.error('[BootTask] Failed:', err.message);
  }
});