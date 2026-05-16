// src/services/authService.js
// ─────────────────────────────────────────────────────────────
// Wraps Firebase Authentication.
// On first sign-in, creates a Firestore user profile.
// Role is stored on the profile: 'patient' | 'caregiver'
// ─────────────────────────────────────────────────────────────

import { auth, usersCol } from './firebase';

// ── Sign Up ───────────────────────────────────────────────────

export const signUp = async ({ name, email, password, role, caregiverForId }) => {
  const credential = await auth().createUserWithEmailAndPassword(email, password);
  const { uid } = credential.user;

  // Update display name
  await credential.user.updateProfile({ displayName: name });

  // Create Firestore profile
  const profile = {
    uid,
    name,
    email,
    role,                               // 'patient' | 'caregiver'
    caregiverForId: caregiverForId || null, // patient's uid that this caregiver monitors
    fcmToken: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await usersCol().doc(uid).set(profile);
  return profile;
};

// ── Sign In ───────────────────────────────────────────────────

export const signIn = async ({ email, password }) => {
  const credential = await auth().signInWithEmailAndPassword(email, password);
  return credential.user;
};

// ── Sign Out ──────────────────────────────────────────────────

export const signOut = async () => {
  await auth().signOut();
};

// ── Fetch user profile from Firestore ────────────────────────

export const getUserProfile = async (uid) => {
  const doc = await usersCol().doc(uid).get();
  if (!doc.exists) return null;
  return doc.data();
};

// ── Update FCM token on profile ───────────────────────────────

export const updateFcmToken = async (uid, token) => {
  await usersCol().doc(uid).update({
    fcmToken: token,
    updatedAt: new Date().toISOString(),
  });
};

// ── Listen to auth state changes ─────────────────────────────

export const onAuthStateChanged = (callback) => {
  return auth().onAuthStateChanged(callback);
};

// ── Reset password ────────────────────────────────────────────

export const resetPassword = async (email) => {
  await auth().sendPasswordResetEmail(email);
};

// ── Link caregiver to patient ─────────────────────────────────
// Called after sign-up if the user enters a patient's UID/link code

export const linkCaregiverToPatient = async (caregiverUid, patientUid) => {
  await usersCol().doc(caregiverUid).update({
    caregiverForId: patientUid,
    updatedAt: new Date().toISOString(),
  });
};
