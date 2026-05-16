// src/services/firebase.js
// ─────────────────────────────────────────────────────────────
// Firebase is initialized automatically by @react-native-firebase
// when google-services.json (Android) / GoogleService-Info.plist (iOS)
// are present. This file exports the individual service instances.
// ─────────────────────────────────────────────────────────────

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';

export { auth, firestore, messaging };

// ── Firestore collection helpers ─────────────────────────────

/** Returns the users collection reference */
export const usersCol = () => firestore().collection('users');

/** Returns the medications sub-collection for a given userId */
export const medicationsCol = (userId) =>
  firestore().collection('users').doc(userId).collection('medications');

/** Returns the doseLogs sub-collection for a given userId */
export const doseLogsCol = (userId) =>
  firestore().collection('users').doc(userId).collection('doseLogs');

/** Returns the caregiverAlerts sub-collection for a given userId */
export const alertsCol = (userId) =>
  firestore().collection('users').doc(userId).collection('caregiverAlerts');
