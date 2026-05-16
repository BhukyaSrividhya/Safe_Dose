// App.js
import React, { useEffect, useState } from 'react';
import { StatusBar, View, ActivityIndicator, AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import messaging from '@react-native-firebase/messaging';
import notifee, { EventType } from '@notifee/react-native';

import { AuthProvider, useAuth } from './src/store/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import {
  configurePushNotifications,
  requestNotificationPermission,
  checkExactAlarmPermission,
  CHANNEL_CAREGIVER,
} from './src/services/notifications';
import { startSyncListener } from './src/services/syncService';
import { scheduleAllTodayDoses } from './src/services/medicationService';
import { initDatabase } from './src/services/database';
import { updateFcmToken } from './src/services/authService';
import { emitNotificationTap } from './src/services/notificationEvents';
import { Colors } from './src/utils/theme';

// ── IMPORTANT ─────────────────────────────────────────────────
// Do NOT register messaging().setBackgroundMessageHandler() or
// notifee.onBackgroundEvent() here. Both are registered in index.js
// (the JS entry point). Registering them again here causes the second
// call to silently overwrite the first, breaking all background
// message handling and notification-tap routing.
// ─────────────────────────────────────────────────────────────

// ── Inner component ───────────────────────────────────────────
const AppInner = () => {
  const { user, loading } = useAuth();

  // Permissions — request once on mount
  useEffect(() => {
    const requestAndCheck = async () => {
      const granted = await requestNotificationPermission();
      console.log('[App] POST_NOTIFICATIONS granted:', granted);
      if (granted) {
        await checkExactAlarmPermission();
      }
    };
    requestAndCheck();

    // Re-check when returning from Settings; re-schedule if permission now granted
    const sub = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active') {
        const alreadyGranted = await checkExactAlarmPermission();
        if (alreadyGranted && user) {
          scheduleAllTodayDoses(user.uid).catch(() => {});
        }
      }
    });
    return () => sub.remove();
  }, []);

  // Per-user setup — runs whenever the signed-in user changes
  useEffect(() => {
    if (!user || loading) return;

    console.log('[App] User ready:', user.uid);
    startSyncListener(user.uid);
    scheduleAllTodayDoses(user.uid).catch((err) =>
      console.warn('[App] scheduleTodayDoses failed:', err.message),
    );

    // Save FCM token so Cloud Function can push to this device
    const saveFcmToken = async () => {
      try {
        const token = await messaging().getToken();
        if (token) {
          await updateFcmToken(user.uid, token);
          console.log('[App] FCM token saved');
        }
      } catch (err) {
        console.warn('[App] FCM token save failed:', err.message);
      }
    };
    saveFcmToken();

    const unsubToken = messaging().onTokenRefresh(async (token) => {
      try { await updateFcmToken(user.uid, token); } catch (_) {}
    });

    // FCM foreground handler — show local notifee notification while app is open
    const unsubForeground = messaging().onMessage(async (remoteMessage) => {
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

    // FCM background tap — app was backgrounded, user tapped the notification
    const unsubBgTap = messaging().onNotificationOpenedApp((msg) => {
      if (msg.data) emitNotificationTap(msg.data);
    });

    return () => {
      unsubToken();
      unsubForeground();
      unsubBgTap();
    };
  }, [user, loading]);

  // FCM quit-state tap — app was killed, user tapped notification to open it
  useEffect(() => {
    messaging().getInitialNotification().then((msg) => {
      if (msg?.data) emitNotificationTap(msg.data);
    });
  }, []);

  return <AppNavigator />;
};

// ── Root component ────────────────────────────────────────────
const App = () => {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        console.log('[App] Initialising database...');
        await initDatabase();
        await configurePushNotifications();
        console.log('[App] Bootstrap complete.');
        setDbReady(true);
      } catch (err) {
        console.error('[App] Bootstrap failed:', err);
        setDbReady(true); // still render — don't show infinite spinner
      }
    };
    bootstrap();
  }, []);

  if (!dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.surface} />
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </GestureHandlerRootView>
  );
};

export default App;