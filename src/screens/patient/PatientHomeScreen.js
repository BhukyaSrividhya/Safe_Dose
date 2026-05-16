// src/screens/patient/PatientHomeScreen.js
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import { useAuth } from '../../store/AuthContext';
import { getTodayDoseLogs } from '../../services/medicationService';
import { Colors, Typography, Spacing, Radii, Shadow, TouchTarget } from '../../utils/theme';
import { onNotificationTap } from '../../services/notificationEvents';

const PatientHomeScreen = ({ navigation }) => {
  const { user, profile } = useAuth();
  const [doseLogs, setDoseLogs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState('');

  // Load today's doses
  const loadTodayDoses = useCallback(async () => {
    if (!user) return;
    const logs = await getTodayDoseLogs(user.uid);
    setDoseLogs(logs);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadTodayDoses();
    }, [loadTodayDoses]),
  );

  useEffect(() => {
    // Dynamic greeting
    const h = new Date().getHours();
    if (h < 12) setGreeting('Good Morning');
    else if (h < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    // Listen for notification taps → navigate to confirm screen
    const unsub = onNotificationTap((data) => {
      if (data?.type === 'DOSE_REMINDER' && data?.doseLogId) {
        navigation.navigate('ConfirmDose', {
          doseLogId: data.doseLogId,
          medicationName: data.medicationName,
          dosage: data.dosage,
        });
      }
    });
    return unsub;
  }, [navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTodayDoses();
    setRefreshing(false);
  };

  // Summary counts
  const taken = doseLogs.filter((l) => l.status === 'taken' || l.status === 'late').length;
  const missed = doseLogs.filter((l) => l.status === 'missed').length;
  const pending = doseLogs.filter((l) => l.status === 'pending').length;

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={doseLogs}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.greeting}>{greeting},</Text>
                <Text style={styles.name}>{profile?.name?.split(' ')[0] || 'Friend'} 👋</Text>
              </View>
              <Text style={styles.dateText}>{format(new Date(), 'EEE, d MMM')}</Text>
            </View>

            {/* Summary cards */}
            <View style={styles.summaryRow}>
              <SummaryCard count={taken} label="Taken" color={Colors.success} icon="check-circle" />
              <SummaryCard count={pending} label="Pending" color={Colors.primary} icon="clock-outline" />
              <SummaryCard count={missed} label="Missed" color={Colors.danger} icon="alert-circle" />
            </View>

            {/* Today's schedule label */}
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            {doseLogs.length === 0 && (
              <View style={styles.emptyState}>
                <Icon name="close-circle-outline" size={56} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>No medications today</Text>
                <Text style={styles.emptySubtitle}>Add medications from the Medications tab</Text>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => (
          <DoseCard
            log={item}
            onConfirm={() =>
              navigation.navigate('ConfirmDose', {
                doseLogId: item.id,
                medicationName: item.medName,
                dosage: item.medDosage,
              })
            }
          />
        )}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
};

// ── Summary card ──────────────────────────────────────────────

const SummaryCard = ({ count, label, color, icon }) => (
  <View style={[styles.summaryCard, { borderTopColor: color }]}>
    <Icon name={icon} size={28} color={color} />
    <Text style={[styles.summaryCount, { color }]}>{count}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

// ── Dose card ─────────────────────────────────────────────────

const DoseCard = ({ log, onConfirm }) => {
  const isPending = log.status === 'pending';
  const isMissed = log.status === 'missed';
  const isTaken = log.status === 'taken';
  const isLate = log.status === 'late';

  const statusConfig = {
    taken: { color: Colors.success, bg: Colors.statusTaken, icon: 'check-circle', label: 'Taken' },
    late: { color: Colors.warning, bg: Colors.statusLate, icon: 'clock-alert', label: 'Late – Taken' },
    missed: { color: Colors.danger, bg: Colors.statusMissed, icon: 'alert-circle', label: 'Missed' },
    pending: { color: Colors.primary, bg: Colors.statusPending, icon: 'clock-outline', label: 'Pending' },
  };
  const cfg = statusConfig[log.status];

  return (
    <View style={[styles.doseCard, { backgroundColor: cfg.bg }]}>
      {/* Medicine icon */}
      <View style={[styles.doseIconCircle, { backgroundColor: cfg.color + '22' }]}>
        <Icon name="pill" size={28} color={cfg.color} />
      </View>

      {/* Details */}
      <View style={styles.doseInfo}>
        <Text style={styles.doseMedName}>{log.medName}</Text>
        <Text style={styles.doseDosage}>{log.medDosage}</Text>
        <Text style={styles.doseTime}>
          {format(new Date(log.scheduledTime), 'h:mm a')}
        </Text>
      </View>

      {/* Status / Action */}
      <View style={styles.doseAction}>
        {isPending ? (
          <TouchableOpacity
            style={styles.takenBtn}
            onPress={onConfirm}
            accessibilityLabel="Mark as taken">
            <Icon name="check" size={22} color={Colors.white} />
            <Text style={styles.takenBtnText}>TAKEN</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.statusBadge}>
            <Icon name={cfg.icon} size={18} color={cfg.color} />
            <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  greeting: { fontSize: Typography.bodyLarge, color: Colors.textSecondary },
  name: {
    fontSize: Typography.headingLarge,
    fontWeight: Typography.weightBold,
    color: Colors.textPrimary,
  },
  dateText: {
    fontSize: Typography.bodyLarge,
    color: Colors.textSecondary,
    fontWeight: Typography.weightMedium,
    marginTop: Spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderTopWidth: 4,
    ...Shadow.sm,
  },
  summaryCount: {
    fontSize: Typography.headingLarge,
    fontWeight: Typography.weightBold,
    marginTop: Spacing.xs,
  },
  summaryLabel: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    fontWeight: Typography.weightMedium,
  },
  sectionTitle: {
    fontSize: Typography.headingSmall,
    fontWeight: Typography.weightBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyTitle: {
    fontSize: Typography.headingSmall,
    fontWeight: Typography.weightBold,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontSize: Typography.bodyLarge,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  doseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  doseIconCircle: {
    width: 56,
    height: 56,
    borderRadius: Radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  doseInfo: { flex: 1 },
  doseMedName: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.weightBold,
    color: Colors.textPrimary,
  },
  doseDosage: {
    fontSize: Typography.bodyMedium,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  doseTime: {
    fontSize: Typography.bodyMedium,
    color: Colors.textMuted,
    marginTop: 2,
  },
  doseAction: { alignItems: 'center' },
  takenBtn: {
    backgroundColor: Colors.success,
    borderRadius: Radii.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    minWidth: TouchTarget.min,
    minHeight: 56,
    justifyContent: 'center',
    gap: 4,
    ...Shadow.sm,
  },
  takenBtnText: {
    fontSize: Typography.bodySmall,
    fontWeight: Typography.weightBold,
    color: Colors.white,
  },
  statusBadge: {
    alignItems: 'center',
    gap: 4,
  },
  statusLabel: {
    fontSize: Typography.caption,
    fontWeight: Typography.weightSemibold,
  },
});

export default PatientHomeScreen;
