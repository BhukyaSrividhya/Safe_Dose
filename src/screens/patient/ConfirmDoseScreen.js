// src/screens/patient/ConfirmDoseScreen.js
// ─────────────────────────────────────────────────────────────
// Modal screen that appears when user taps TAKEN or taps a reminder.
// Shows: "Did you take [MedName – Dosage]?"
// Options: YES / NO
// On YES → 10-second undo window
// Implements US-02 acceptance criteria fully.
// ─────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../../store/AuthContext';
import { confirmDose, undoConfirmation } from '../../services/doseConfirmationService';
import { getMedicationById } from '../../services/database';
import { Colors, Typography, Spacing, Radii, Shadow, TouchTarget } from '../../utils/theme';

const UNDO_SECONDS = 10;

const ConfirmDoseScreen = ({ route, navigation }) => {
  const { doseLogId, medicationName, dosage } = route.params;
  const { user } = useAuth();

  const [phase, setPhase] = useState('question'); // 'question' | 'undo' | 'done'
  const [result, setResult] = useState(null);     // { status, confirmedAt }
  const [undoSecondsLeft, setUndoSecondsLeft] = useState(UNDO_SECONDS);
  const [loading, setLoading] = useState(false);
  const [isCritical, setIsCritical] = useState(false);

  const undoTimerRef = useRef(null);
  const undoIntervalRef = useRef(null);
  const undoProgress = useRef(new Animated.Value(1)).current;

  // Fetch medication to know if it's critical (for undo timer restart)
  useEffect(() => {
    const fetchMed = async () => {
      // doseLogId format: medicationId-yyyyMMdd-HHmm
      // extract medicationId (first segment before the date portion)
      const parts = doseLogId.split('-');
      // UUID has 5 segments, date adds 2 more
      const medId = parts.slice(0, 5).join('-');
      const med = await getMedicationById(medId);
      if (med) setIsCritical(med.isCritical);
    };
    fetchMed().catch(() => {});
  }, [doseLogId]);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await confirmDose(doseLogId, user.uid);
      setResult(res);
      setPhase('undo');
      startUndoCountdown();
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not confirm dose. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startUndoCountdown = () => {
    setUndoSecondsLeft(UNDO_SECONDS);

    // Animate the progress bar
    undoProgress.setValue(1);
    Animated.timing(undoProgress, {
      toValue: 0,
      duration: UNDO_SECONDS * 1000,
      useNativeDriver: false,
    }).start();

    // Countdown display
    undoIntervalRef.current = setInterval(() => {
      setUndoSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(undoIntervalRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    // Auto-close after undo window
    undoTimerRef.current = setTimeout(() => {
      setPhase('done');
      setTimeout(() => navigation.goBack(), 1200);
    }, UNDO_SECONDS * 1000);
  };

  const handleUndo = async () => {
    // Clear the undo countdown
    clearTimeout(undoTimerRef.current);
    clearInterval(undoIntervalRef.current);
    undoProgress.stopAnimation();

    setLoading(true);
    try {
      await undoConfirmation(doseLogId, user.uid, isCritical);
      setPhase('question');
      setResult(null);
    } catch (err) {
      Alert.alert('Error', 'Could not undo confirmation. Please try again.');
      setPhase('question');
    } finally {
      setLoading(false);
    }
  };

  const handleNo = () => {
    navigation.goBack();
  };

  useEffect(() => {
    return () => {
      clearTimeout(undoTimerRef.current);
      clearInterval(undoIntervalRef.current);
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        {/* ── QUESTION PHASE ─────────────────────────────────── */}
        {phase === 'question' && (
          <>
            <View style={styles.iconCircle}>
              <Icon name="pill" size={64} color={Colors.primary} />
            </View>

            <Text style={styles.question}>Did you take this medicine?</Text>

            <View style={styles.medCard}>
              <Text style={styles.medName}>{medicationName}</Text>
              <Text style={styles.medDosage}>{dosage}</Text>
            </View>

            <View style={styles.buttonsRow}>
              {/* NO button */}
              <TouchableOpacity
                style={styles.noBtn}
                onPress={handleNo}
                accessibilityLabel="No, I did not take it">
                <Icon name="close" size={28} color={Colors.danger} />
                <Text style={styles.noBtnText}>NO</Text>
              </TouchableOpacity>

              {/* YES / TAKEN button — minimum 80×80dp */}
              <TouchableOpacity
                style={[styles.yesBtn, loading && styles.btnDisabled]}
                onPress={handleConfirm}
                disabled={loading}
                accessibilityLabel="Yes, I took my medicine">
                {loading ? (
                  <ActivityIndicator color={Colors.white} size="large" />
                ) : (
                  <>
                    <Icon name="check-circle" size={36} color={Colors.white} />
                    <Text style={styles.yesBtnText}>YES, TAKEN</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.hint}>
              Press YES only after you have actually taken the medicine.
            </Text>
          </>
        )}

        {/* ── UNDO PHASE ─────────────────────────────────────── */}
        {phase === 'undo' && (
          <>
            <View style={[styles.iconCircle, { backgroundColor: Colors.statusTaken }]}>
              <Icon name="check-circle" size={64} color={Colors.success} />
            </View>

            <Text style={styles.confirmedTitle}>Dose Confirmed!</Text>
            <Text style={styles.confirmedSubtitle}>
              {result?.status === 'late'
                ? `Marked as late – taken (${result.minutesLate} min late)`
                : 'Marked as taken. Well done!'}
            </Text>

            {/* Undo progress bar */}
            <View style={styles.undoBarWrapper}>
              <Animated.View
                style={[
                  styles.undoBar,
                  {
                    width: undoProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.undoHint}>
              Tap UNDO within {undoSecondsLeft}s if you made a mistake
            </Text>

            <TouchableOpacity
              style={[styles.undoBtn, loading && styles.btnDisabled]}
              onPress={handleUndo}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color={Colors.warning} />
              ) : (
                <>
                  <Icon name="undo" size={22} color={Colors.warning} />
                  <Text style={styles.undoBtnText}>UNDO ({undoSecondsLeft}s)</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* ── DONE PHASE ─────────────────────────────────────── */}
        {phase === 'done' && (
          <>
            <View style={[styles.iconCircle, { backgroundColor: Colors.statusTaken }]}>
              <Icon name="check-all" size={64} color={Colors.success} />
            </View>
            <Text style={styles.confirmedTitle}>All done!</Text>
            <Text style={styles.confirmedSubtitle}>Your caregiver has been notified.</Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: Radii.full,
    backgroundColor: '#EEF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    ...Shadow.md,
  },
  question: {
    fontSize: Typography.headingLarge,
    fontWeight: Typography.weightBold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  medCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    width: '100%',
    marginBottom: Spacing.xl,
    ...Shadow.sm,
  },
  medName: {
    fontSize: Typography.headingMedium,
    fontWeight: Typography.weightBold,
    color: Colors.primary,
  },
  medDosage: {
    fontSize: Typography.bodyLarge,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  noBtn: {
    width: TouchTarget.min,
    height: TouchTarget.min,
    borderRadius: Radii.lg,
    borderWidth: 2,
    borderColor: Colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    gap: 4,
    ...Shadow.sm,
  },
  noBtnText: {
    fontSize: Typography.bodySmall,
    fontWeight: Typography.weightBold,
    color: Colors.danger,
  },
  yesBtn: {
    flex: 1,
    minHeight: TouchTarget.min,
    backgroundColor: Colors.success,
    borderRadius: Radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    ...Shadow.md,
  },
  yesBtnText: {
    fontSize: Typography.headingSmall,
    fontWeight: Typography.weightBold,
    color: Colors.white,
  },
  btnDisabled: { opacity: 0.6 },
  hint: {
    fontSize: Typography.bodyMedium,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  // Undo phase
  confirmedTitle: {
    fontSize: Typography.headingLarge,
    fontWeight: Typography.weightBold,
    color: Colors.success,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  confirmedSubtitle: {
    fontSize: Typography.bodyLarge,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  undoBarWrapper: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: Radii.full,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  undoBar: {
    height: '100%',
    backgroundColor: Colors.warning,
    borderRadius: Radii.full,
  },
  undoHint: {
    fontSize: Typography.bodyMedium,
    color: Colors.textMuted,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.statusLate,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderWidth: 2,
    borderColor: Colors.warning,
  },
  undoBtnText: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.weightBold,
    color: Colors.warning,
  },
});

export default ConfirmDoseScreen;
