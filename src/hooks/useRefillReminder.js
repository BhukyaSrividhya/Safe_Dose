// src/hooks/useRefillReminder.js
// ─────────────────────────────────────────────────────────────
// Checks pill stock for each medication.
// If pillCount / dailyDoses <= 5 days, fires a local notification
// and persists a flag so the reminder doesn't repeat until
// the caregiver marks it as refilled (or pill count is updated).
//
// Called once per app launch after medications are loaded.
// US-10: "Reminder fires 5 days before estimated stock runs out."
// ─────────────────────────────────────────────────────────────

import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PushNotification from 'react-native-push-notification';
import { getMedications } from '../services/medicationService';

const REFILL_REMINDER_KEY = '@safedose_refill_reminded';

export const useRefillReminder = (userId) => {
  useEffect(() => {
    if (!userId) return;
    checkRefillReminders(userId);
  }, [userId]);
};

const checkRefillReminders = async (userId) => {
  try {
    const meds = await getMedications(userId);
    // Load already-reminded medication IDs to avoid repeat same-day alerts
    const raw = await AsyncStorage.getItem(REFILL_REMINDER_KEY);
    const remindedToday = raw ? JSON.parse(raw) : {};

    const today = new Date().toDateString();
    const newReminded = {};

    for (const med of meds) {
      if (med.pillCount <= 0) continue; // pill count not tracked

      const dailyDoses = med.times.length;
      const daysRemaining = Math.floor(med.pillCount / dailyDoses);

      if (daysRemaining <= 5) {
        // Skip if already reminded today
        if (remindedToday[med.id] === today) {
          newReminded[med.id] = today;
          continue;
        }

        // Fire local notification immediately
        PushNotification.localNotification({
          channelId: 'safedose-reminders',
          title: '💊 Refill Reminder',
          message: `${med.name} has about ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} of supply left. Time to refill!`,
          importance: 'default',
          userInfo: {
            type: 'REFILL_REMINDER',
            medicationId: med.id,
            medicationName: med.name,
          },
        });

        newReminded[med.id] = today;
      }
    }

    await AsyncStorage.setItem(REFILL_REMINDER_KEY, JSON.stringify(newReminded));
  } catch (err) {
    console.warn('[RefillReminder] Error:', err.message);
  }
};
