// functions/index.js
// ─────────────────────────────────────────────────────────────
// Firebase Cloud Functions for SafeDose.
//
// Function 1: onMissedDoseAlert
//   Triggered when a new caregiverAlert document is created
//   in /users/{patientId}/caregiverAlerts/{alertId}
//   → Looks up the caregiver linked to this patient
//   → Sends batched FCM notification to caregiver's device
//   → Limits to max 2 FCM pushes per hour (caregiver fatigue rule)
//
// Function 2: onScheduleDailyDoses
//   Cloud Scheduler trigger at midnight each day
//   → Not implemented in MVP (doses are scheduled client-side)
//   → Placeholder for future server-side scheduling
// ─────────────────────────────────────────────────────────────

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();
const fcm = admin.messaging();

// ── Rate limiting state (in-memory, per Cloud Function instance) ──
// Note: In production, use Firestore to store last-alert timestamps
// for true rate limiting across function instances.
const caregiverAlertTimestamps = {};

// ── Function 1: Send batched missed-dose alert to caregiver ───

exports.onMissedDoseAlert = functions.firestore
  .document('users/{patientId}/caregiverAlerts/{alertId}')
  .onCreate(async (snap, context) => {
    const { patientId, alertId } = context.params;
    const alertData = snap.data();

    // Only process 'pending' alerts
    if (alertData.status !== 'pending') return null;

    try {
      // ── Step 1: Get patient profile ───────────────────────
      const patientDoc = await db.collection('users').doc(patientId).get();
      if (!patientDoc.exists) {
        console.warn(`Patient ${patientId} not found`);
        return null;
      }
      const patient = patientDoc.data();

      // ── Step 2: Find caregiver(s) linked to this patient ──
      const caregiversSnap = await db
        .collection('users')
        .where('caregiverForId', '==', patientId)
        .where('role', '==', 'caregiver')
        .get();

      if (caregiversSnap.empty) {
        console.log(`No caregiver linked for patient ${patientId}`);
        await snap.ref.update({ status: 'no_caregiver' });
        return null;
      }

      // ── Step 3: Rate limit — max 2 alerts per hour ────────
      const now = Date.now();
      const hourMs = 60 * 60 * 1000;

      const recentAlertsSnap = await db
        .collection('users')
        .doc(patientId)
        .collection('caregiverAlerts')
        .where('status', '==', 'sent')
        .where('createdAt', '>', new Date(now - hourMs).toISOString())
        .get();

      if (recentAlertsSnap.size >= 2) {
        console.log(`Rate limit hit for patient ${patientId}: ${recentAlertsSnap.size} alerts in last hour`);
        await snap.ref.update({ status: 'rate_limited' });
        return null;
      }

      // ── Step 4: Build FCM message ─────────────────────────
      const count = alertData.alerts?.length || 1;
      const patientName = patient.name || 'Your patient';

      const notifTitle = count === 1
        ? `⚠️ ${patientName} missed a dose`
        : `⚠️ ${patientName} missed ${count} doses`;

      const notifBody = count === 1
        ? `${patientName} has not confirmed their medication. Please check in.`
        : `${patientName} missed ${count} medications. Tap to view details.`;

      // ── Step 5: Send FCM to each caregiver ────────────────
      const sendPromises = caregiversSnap.docs.map(async (caregiverDoc) => {
        const caregiver = caregiverDoc.data();
        if (!caregiver.fcmToken) {
          console.log(`Caregiver ${caregiverDoc.id} has no FCM token`);
          return null;
        }

        const message = {
          token: caregiver.fcmToken,
          notification: {
            title: notifTitle,
            body: notifBody,
          },
          data: {
            type: 'MISSED_DOSE_ALERT',
            patientId,
            patientName: patient.name || '',
            count: String(count),
            alertId,
          },
          android: {
            priority: 'high',
            notification: {
              channelId: 'safedose-caregiver',
              priority: 'max',
              defaultVibrateTimings: true,
            },
          },
          apns: {
            payload: {
              aps: {
                alert: { title: notifTitle, body: notifBody },
                sound: 'default',
                badge: count,
              },
            },
          },
        };

        try {
          const result = await fcm.send(message);
          console.log(`FCM sent to caregiver ${caregiverDoc.id}: ${result}`);
          return result;
        } catch (fcmErr) {
          if (
            fcmErr.code === 'messaging/registration-token-not-registered' ||
            fcmErr.code === 'messaging/invalid-registration-token'
          ) {
            // Token is stale — clear it from the caregiver profile
            await db.collection('users').doc(caregiverDoc.id).update({ fcmToken: null });
          }
          console.error(`FCM error for caregiver ${caregiverDoc.id}:`, fcmErr);
          return null;
        }
      });

      await Promise.all(sendPromises);

      // ── Step 6: Mark alert as sent ────────────────────────
      await snap.ref.update({
        status: 'sent',
        sentAt: new Date().toISOString(),
      });

      console.log(`Alert ${alertId} processed: sent to ${caregiversSnap.size} caregiver(s)`);
      return null;
    } catch (err) {
      console.error(`Error processing alert ${alertId}:`, err);
      await snap.ref.update({ status: 'error', error: err.message });
      return null;
    }
  });

// ── Function 2: Refill reminder check (runs daily at 8 AM IST) ─

exports.checkRefillReminders = functions.pubsub
  .schedule('0 8 * * *')
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    // Get all active medications with pill count set
    const usersSnap = await db.collection('users').where('role', '==', 'patient').get();

    for (const userDoc of usersSnap.docs) {
      const userId = userDoc.id;
      const patient = userDoc.data();

      const medsSnap = await db
        .collection('users')
        .doc(userId)
        .collection('medications')
        .where('active', '==', true)
        .where('pillCount', '>', 0)
        .get();

      for (const medDoc of medsSnap.docs) {
        const med = medDoc.data();
        const dailyDoses = med.times?.length || 1;

        // Estimated days remaining
        const daysRemaining = Math.floor(med.pillCount / dailyDoses);

        if (daysRemaining <= 5) {
          // Send refill reminder to patient
          if (patient.fcmToken) {
            await fcm.send({
              token: patient.fcmToken,
              notification: {
                title: '💊 Refill Reminder',
                body: `${med.name} has approximately ${daysRemaining} days of supply left. Time to refill!`,
              },
              data: { type: 'REFILL_REMINDER', medicationId: medDoc.id },
            });
          }

          // Also alert caregiver
          const caregiverSnap = await db
            .collection('users')
            .where('caregiverForId', '==', userId)
            .get();

          for (const cgDoc of caregiverSnap.docs) {
            const cg = cgDoc.data();
            if (cg.fcmToken) {
              await fcm.send({
                token: cg.fcmToken,
                notification: {
                  title: '💊 Refill Alert',
                  body: `${patient.name}'s ${med.name} needs refill — ${daysRemaining} days left.`,
                },
              });
            }
          }
        }
      }
    }

    return null;
  });
