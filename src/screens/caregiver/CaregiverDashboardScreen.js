// src/screens/caregiver/CaregiverDashboardScreen.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useAuth } from '../../store/AuthContext';
import { doseLogsCol, usersCol } from '../../services/firebase';
import { Colors, Typography, Spacing, Radii, Shadow } from '../../utils/theme';

const CaregiverDashboardScreen = () => {
  const { user, profile } = useAuth();
  const [patientProfile, setPatientProfile] = useState(null);
  const [todayLogs, setTodayLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const patientId = profile?.caregiverForId;

  const loadData = useCallback(async () => {
    if (!patientId) { setLoading(false); return; }

    // Load patient profile
    const patDoc = await usersCol().doc(patientId).get();
    if (patDoc.exists) setPatientProfile(patDoc.data());

    // Load today's dose logs from Firestore
    const from = startOfDay(new Date()).toISOString();
    const to = endOfDay(new Date()).toISOString();
    const snap = await doseLogsCol(patientId)
      .where('scheduledTime', '>=', from)
      .where('scheduledTime', '<=', to)
      .orderBy('scheduledTime', 'desc')
      .get();

    setTodayLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }, [patientId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Counts
  const taken = todayLogs.filter((l) => l.status === 'taken' || l.status === 'late').length;
  const missed = todayLogs.filter((l) => l.status === 'missed').length;
  const pending = todayLogs.filter((l) => l.status === 'pending').length;

  if (!patientId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noPatient}>
          <Icon name="account-question" size={72} color={Colors.textMuted} />
          <Text style={styles.noPatientTitle}>No Patient Linked</Text>
          <Text style={styles.noPatientText}>
            You are not linked to any patient yet.{'\n'}
            Ask the patient to share their User ID from their Profile screen,
            then update your profile to link accounts.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Caregiver Dashboard</Text>
        <Text style={styles.subtitle}>{format(new Date(), 'EEE, d MMM yyyy')}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: Spacing.xxl }} />
      ) : (
        <FlatList
          data={todayLogs}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <>
              {/* Patient card */}
              <View style={styles.patientCard}>
                <View style={styles.patientAvatar}>
                  <Icon name="account" size={32} color={Colors.primary} />
                </View>
                <View>
                  <Text style={styles.patientName}>{patientProfile?.name || 'Patient'}</Text>
                  <Text style={styles.patientEmail}>{patientProfile?.email}</Text>
                </View>
              </View>

              {/* Today's summary */}
              <View style={styles.summaryRow}>
                <SummaryCard count={taken} label="Taken" color={Colors.success} icon="check-circle" />
                <SummaryCard count={pending} label="Pending" color={Colors.primary} icon="clock-outline" />
                <SummaryCard count={missed} label="Missed" color={Colors.danger} icon="alert-circle" />
              </View>

              {missed > 0 && (
                <View style={styles.alertBanner}>
                  <Icon name="alert" size={20} color={Colors.white} />
                  <Text style={styles.alertBannerText}>
                    {missed} dose{missed > 1 ? 's' : ''} missed today
                  </Text>
                </View>
              )}

              <Text style={styles.sectionTitle}>Today's Doses</Text>

              {todayLogs.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No doses scheduled for today</Text>
                </View>
              )}
            </>
          }
          renderItem={({ item }) => <CaregiverDoseRow log={item} />}
        />
      )}
    </SafeAreaView>
  );
};

const SummaryCard = ({ count, label, color, icon }) => (
  <View style={[styles.summaryCard, { borderTopColor: color }]}>
    <Icon name={icon} size={24} color={color} />
    <Text style={[styles.summaryCount, { color }]}>{count}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const statusConfig = {
  taken: { color: Colors.success, icon: 'check-circle', label: 'Taken', bg: Colors.statusTaken },
  late: { color: Colors.warning, icon: 'clock-alert', label: 'Late – Taken', bg: Colors.statusLate },
  missed: { color: Colors.danger, icon: 'alert-circle', label: 'MISSED', bg: Colors.statusMissed },
  pending: { color: Colors.primary, icon: 'clock-outline', label: 'Pending', bg: Colors.statusPending },
};

const CaregiverDoseRow = ({ log }) => {
  const cfg = statusConfig[log.status] || statusConfig.pending;
  return (
    <View style={[styles.doseRow, { backgroundColor: cfg.bg }]}>
      <Icon name={cfg.icon} size={22} color={cfg.color} />
      <View style={styles.doseInfo}>
        <Text style={styles.doseMed}>{log.medicationId}</Text>
        <Text style={styles.doseTime}>
          Scheduled: {format(new Date(log.scheduledTime), 'h:mm a')}
        </Text>
        {log.confirmedAt && (
          <Text style={styles.doseConfirmed}>
            Confirmed: {format(new Date(log.confirmedAt), 'h:mm a')}
          </Text>
        )}
      </View>
      <View style={[styles.statusPill, { backgroundColor: cfg.color }]}>
        <Text style={styles.statusPillText}>{cfg.label}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    ...Shadow.sm,
  },
  title: { fontSize: Typography.headingLarge, fontWeight: Typography.weightBold, color: Colors.textPrimary },
  subtitle: { fontSize: Typography.bodyMedium, color: Colors.textSecondary, marginTop: 2 },
  list: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  noPatient: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  noPatientTitle: { fontSize: Typography.headingSmall, fontWeight: Typography.weightBold, color: Colors.textSecondary, marginTop: Spacing.md },
  noPatientText: { fontSize: Typography.bodyLarge, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 26 },
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  patientAvatar: {
    width: 56,
    height: 56,
    borderRadius: Radii.full,
    backgroundColor: '#EEF4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientName: { fontSize: Typography.bodyLarge, fontWeight: Typography.weightBold, color: Colors.textPrimary },
  patientEmail: { fontSize: Typography.bodySmall, color: Colors.textMuted },
  summaryRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderTopWidth: 4,
    ...Shadow.sm,
  },
  summaryCount: { fontSize: Typography.headingLarge, fontWeight: Typography.weightBold, marginTop: 4 },
  summaryLabel: { fontSize: Typography.caption, color: Colors.textSecondary, fontWeight: Typography.weightMedium },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.danger,
    borderRadius: Radii.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  alertBannerText: { fontSize: Typography.bodyLarge, fontWeight: Typography.weightBold, color: Colors.white },
  sectionTitle: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.weightBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xl },
  emptyText: { fontSize: Typography.bodyLarge, color: Colors.textMuted },
  doseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...Shadow.sm,
  },
  doseInfo: { flex: 1 },
  doseMed: { fontSize: Typography.bodyLarge, fontWeight: Typography.weightBold, color: Colors.textPrimary },
  doseTime: { fontSize: Typography.bodySmall, color: Colors.textSecondary, marginTop: 2 },
  doseConfirmed: { fontSize: Typography.bodySmall, color: Colors.success, marginTop: 2 },
  statusPill: {
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  statusPillText: { fontSize: 11, fontWeight: Typography.weightBold, color: Colors.white },
});

export default CaregiverDashboardScreen;
