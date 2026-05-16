// src/screens/patient/MedicationDetailScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { getMedicationById } from '../../services/database';
import { getDoseLogsRange, deleteMedication } from '../../services/medicationService';
import { useAuth } from '../../store/AuthContext';
import { Colors, Typography, Spacing, Radii, Shadow } from '../../utils/theme';

const MedicationDetailScreen = ({ route, navigation }) => {
  const { medId } = route.params;
  const { user } = useAuth();
  const [med, setMed] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const m = await getMedicationById(medId);
      setMed(m);

      // Last 7 days of dose logs
      const logs = await getDoseLogsRange(
        user.uid,
        startOfDay(subDays(new Date(), 6)).toISOString(),
        endOfDay(new Date()).toISOString(),
      );
      setRecentLogs(logs.filter((l) => l.medicationId === medId));
      setLoading(false);
    };
    load();
  }, [medId, user.uid]);

  const handleDelete = () => {
    const msg = med?.isCritical
      ? `⚠️ "${med.name}" is marked as Critical. Are you sure you want to delete it?`
      : `Delete "${med?.name}"? This will cancel all future reminders.`;
    Alert.alert('Delete Medication', msg, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteMedication(user.uid, medId);
          navigation.goBack();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!med) {
    return (
      <View style={styles.loading}>
        <Text style={{ color: Colors.textSecondary }}>Medication not found.</Text>
      </View>
    );
  }

  const taken = recentLogs.filter((l) => l.status === 'taken' || l.status === 'late').length;
  const missed = recentLogs.filter((l) => l.status === 'missed').length;
  const total = recentLogs.filter((l) => l.status !== 'pending').length;
  const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header card */}
        <View style={[styles.headerCard, med.isCritical && styles.headerCardCritical]}>
          <View style={styles.medIconCircle}>
            <Icon name="pill" size={40} color={med.isCritical ? Colors.danger : Colors.primary} />
          </View>
          <Text style={styles.medName}>{med.name}</Text>
          <Text style={styles.medDosage}>{med.dosage}</Text>
          {med.isCritical && (
            <View style={styles.criticalBadge}>
              <Icon name="alert" size={14} color={Colors.white} />
              <Text style={styles.criticalBadgeText}>CRITICAL — 5 min alert</Text>
            </View>
          )}
        </View>

        {/* Reminder times */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reminder Times</Text>
          <View style={styles.timesRow}>
            {med.times.map((t, i) => (
              <View key={i} style={styles.timeChip}>
                <Icon name="alarm" size={16} color={Colors.primary} />
                <Text style={styles.timeChipText}>
                  {format(new Date(`2000-01-01T${t}`), 'h:mm a')}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Pill stock */}
        {med.pillCount > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pill Stock</Text>
            <View style={styles.statRow}>
              <Icon name="counter" size={22} color={Colors.primary} />
              <Text style={styles.statText}>{med.pillCount} pills remaining</Text>
            </View>
          </View>
        )}

        {/* 7-day adherence */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Last 7 Days</Text>
          <View style={styles.adherenceRow}>
            <AdherenceStat label="Taken" value={taken} color={Colors.success} />
            <AdherenceStat label="Missed" value={missed} color={Colors.danger} />
            <AdherenceStat
              label="Rate"
              value={adherenceRate !== null ? `${adherenceRate}%` : 'N/A'}
              color={adherenceRate >= 80 ? Colors.success : adherenceRate >= 50 ? Colors.warning : Colors.danger}
            />
          </View>
        </View>

        {/* Recent logs */}
        {recentLogs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Doses</Text>
            {recentLogs.slice(0, 10).map((log) => (
              <LogRow key={log.id} log={log} />
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('EditMedication', { medId })}>
            <Icon name="pencil" size={20} color={Colors.primary} />
            <Text style={styles.editBtnText}>Edit Medication</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Icon name="trash-can-outline" size={20} color={Colors.danger} />
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const AdherenceStat = ({ label, value, color }) => (
  <View style={styles.adherenceStat}>
    <Text style={[styles.adherenceValue, { color }]}>{value}</Text>
    <Text style={styles.adherenceLabel}>{label}</Text>
  </View>
);

const statusConfig = {
  taken: { color: Colors.success, icon: 'check-circle', label: 'Taken' },
  late: { color: Colors.warning, icon: 'clock-alert', label: 'Late' },
  missed: { color: Colors.danger, icon: 'alert-circle', label: 'Missed' },
  pending: { color: Colors.primary, icon: 'clock-outline', label: 'Pending' },
};

const LogRow = ({ log }) => {
  const cfg = statusConfig[log.status] || statusConfig.pending;
  return (
    <View style={styles.logRow}>
      <Icon name={cfg.icon} size={18} color={cfg.color} />
      <Text style={styles.logTime}>
        {format(new Date(log.scheduledTime), 'EEE d MMM, h:mm a')}
      </Text>
      <Text style={[styles.logStatus, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  headerCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.md,
    borderTopWidth: 5,
    borderTopColor: Colors.primary,
    ...Shadow.md,
  },
  headerCardCritical: { borderTopColor: Colors.danger },
  medIconCircle: {
    width: 80,
    height: 80,
    borderRadius: Radii.full,
    backgroundColor: '#EEF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  medName: {
    fontSize: Typography.headingLarge,
    fontWeight: Typography.weightBold,
    color: Colors.textPrimary,
  },
  medDosage: {
    fontSize: Typography.bodyLarge,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  criticalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.danger,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.sm,
    gap: 6,
  },
  criticalBadgeText: {
    fontSize: Typography.bodySmall,
    fontWeight: Typography.weightBold,
    color: Colors.white,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  sectionTitle: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.weightBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  timesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF4FF',
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: 6,
  },
  timeChipText: {
    fontSize: Typography.bodyMedium,
    fontWeight: Typography.weightSemibold,
    color: Colors.primary,
  },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  statText: { fontSize: Typography.bodyLarge, color: Colors.textPrimary },
  adherenceRow: { flexDirection: 'row', justifyContent: 'space-around' },
  adherenceStat: { alignItems: 'center' },
  adherenceValue: { fontSize: Typography.headingLarge, fontWeight: Typography.weightBold },
  adherenceLabel: { fontSize: Typography.bodySmall, color: Colors.textMuted, marginTop: 4 },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  logTime: { flex: 1, fontSize: Typography.bodyMedium, color: Colors.textSecondary },
  logStatus: { fontSize: Typography.bodySmall, fontWeight: Typography.weightSemibold },
  actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  editBtnText: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.weightBold,
    color: Colors.primary,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.dangerLight,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  deleteBtnText: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.weightBold,
    color: Colors.danger,
  },
});

export default MedicationDetailScreen;
