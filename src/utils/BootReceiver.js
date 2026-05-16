// android/app/src/main/java/com/safedose/BootReceiver.java
// ─────────────────────────────────────────────────────────────
// Registers a BOOT_COMPLETED broadcast receiver so that all
// local medication alarms are rescheduled after a phone reboot.
//
// This addresses the critical edge case discovered in Deliverable 3:
// "Phone reboot wipes alarms. This edge case was discovered during
//  D3 simulation." — requires BOOT_COMPLETED receiver.
//
// SETUP INSTRUCTIONS:
// 1. Add this file to your Android project at the path shown above.
// 2. Register it in AndroidManifest.xml (see below).
// ─────────────────────────────────────────────────────────────

/*
package com.safedose;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "SafeDose:BootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction()) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(intent.getAction())) {
            Log.d(TAG, "Boot completed — rescheduling medication alarms");

            // Launch the React Native app's HeadlessTask to reschedule alarms
            Intent serviceIntent = new Intent(context, RescheduleAlarmsService.class);
            context.startService(serviceIntent);
        }
    }
}
*/

// ─────────────────────────────────────────────────────────────
// REQUIRED: Add to android/app/src/main/AndroidManifest.xml
// inside <application> tag:
//
// <receiver
//   android:name=".BootReceiver"
//   android:enabled="true"
//   android:exported="true">
//   <intent-filter android:priority="999">
//     <action android:name="android.intent.action.BOOT_COMPLETED" />
//     <action android:name="android.intent.action.QUICKBOOT_POWERON" />
//     <category android:name="android.intent.category.DEFAULT" />
//   </intent-filter>
// </receiver>
//
// Also add this PERMISSION at the top level (sibling of <application>):
// <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// React Native HeadlessTask registered in index.js
// This runs in the background after boot to reschedule all alarms.
// ─────────────────────────────────────────────────────────────
export const RESCHEDULE_TASK_NAME = 'SAFEDOSE_RESCHEDULE_ALARMS';
