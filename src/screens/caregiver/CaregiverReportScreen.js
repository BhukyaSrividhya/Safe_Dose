// src/screens/caregiver/CaregiverReportScreen.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { subDays, startOfDay, endOfDay, format, eachDayOfInterval } from 'date-fns';
import { useAuth } from '../../store/AuthContext';
import { doseLogsCol } from '../../services/firebase';
import { Colors, Typography, Spacing, Radii, Shadow } from '../../utils/theme';

const RANGES = [
  { label: '7 Days', days: 7 },
  { label: '14 Days', days: 14 },
  { label: '30 Days', days: 30 },
];

const CaregiverReportScreen = () => {
  const { profile } = useAuth();
  const [selectedRange, setSelectedRange] = useState(7);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const patientId = profile?.caregiverForId;

  const loadReport = useCallback(async () => {
    if (!patientId) { setLoading(false); return; }
    setLoading(true);
    const from = startOfDay(subDays(new Date(), selectedRange - 1)).toISOString();
    const to = endOfDay(new Date()).toISOString();

    const snap = await doseLogsCol(patientId)
      .where('scheduledTime', '>=', from)
      .where('scheduledTime', '<=', to)
      .orderBy('scheduledTime', 'desc')
      .get();

    setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }, [patientId, selectedRange]);

  useFocusEffect(
    useCallback(() => {
      loadReport();
    }, [loadReport]),
  );

  const completed = logs.filter((l) => l.status !== 'pending');
  const taken = completed.filter((l) => l.status === 'taken' || l.status === 'late').length;
  const missed = completed.filter((l) => l.status === 'missed').length;
  const late = completed.filter((l) => l.status === 'late').length;
  const total = completed.length;
  const rate = total > 0 ? Math.round((taken / total) * 100) : null;

  const days = eachDayOfInterval({
    start: subDays(new Date(), selectedRange - 1),
    end: new Date(),
  });

  const dayStats = days.map((day) => {
    const dayLogs = completed.filter(
      (l) =>
        new Date(l.scheduledTime) >= startOfDay(day) &&
        new Date(l.scheduledTime) <= endOfDay(day),
    );
    const t = dayLogs.filter((l) => l.status === 'taken' || l.status === 'late').length;
    const m = dayLogs.filter((l) => l.status === 'missed').length;
    return { day, taken: t, missed: m, total: dayLogs.length };
  });

  const handleExportInfo = () => {
    Alert.alert(
      'Export Report',
      `To export a PDF/CSV report for ${format(subDays(new Date(), selectedRange - 1), 'd MMM')} – ${format(new Date(), 'd MMM yyyy')}:\n\nThis feature exports a full adherence report. In a production build this would generate and share a PDF/CSV file via the device share sheet.\n\n• Total doses: ${total}\n• Taken: ${taken} (${rate ?? 0}%)\n• Missed: ${missed}\n• Late: ${late}`,
      [{ text: 'OK' }],
    );
  };

  if (!patientId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noPatient}>
          <Icon name="account-question" size={72} color={Colors.textMuted} />
          <Text style={styles.noPatientTitle}>No Patient Linked</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Adherence Report</Text>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExportInfo}>
          <Icon name="file-export-outline" size={20} color={Colors.primary} />
          <Text style={styles.exportBtnText}>Export</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Range selector */}
        <View style={styles.rangeRow}>
          {RANGES.map((r) => (
            <TouchableOpacity
              key={r.days}
              style={[styles.rangeBtn, selectedRange === r.days && styles.rangeBtnActive]}
              onPress={() => setSelectedRange(r.days)}>
              <Text style={[styles.rangeBtnText, selectedRange === r.days && styles.rangeBtnTextActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: Spacing.xxl }} />
        ) : (
          <>
            {/* Summary */}
            <View style={styles.summaryCard}>
              <View style={[styles.rateCircle, { backgroundColor: rate >= 80 ? Colors.success : rate >= 50 ? Colors.warning : Colors.danger }]}>
                <Text style={styles.rateValue}>{rate !== null ? `${rate}%` : 'N/A'}</Text>
                <Text style={styles.rateLabel}>Adherence</Text>
              </View>
              <View style={styles.statsList}>
                <StatRow color={Colors.success} label="Taken on time" value={taken - late} />
                <StatRow color={Colors.warning} label="Taken late" value={late} />
                <StatRow color={Colors.danger} label="Missed" value={missed} />
                <StatRow color={Colors.primary} label="Total recorded" value={total} />
              </View>
            </View>

            {/* Day-by-day */}
            <Text style={styles.sectionTitle}>Daily Breakdown</Text>
            {dayStats.reverse().map(({ day, taken: t, missed: m, total: tot }) => (
              <View key={day.toISOString()} style={styles.dayRow}>
                <Text style={styles.dayName}>{format(day, 'EEE, d MMM')}</Text>
                {tot === 0 ? (
                  <Text style={styles.noData}>No data</Text>
                ) : (
                  <View style={styles.dayStatsCol}>
                    <View style={styles.dayBarBg}>
                      <View style={[styles.dayBar, { width: `${Math.round((t / tot) * 100)}%`, backgroundColor: Colors.success }]} />
                    </View>
                    <Text style={styles.dayPercent}>
                      {Math.round((t / tot) * 100)}%
                    </Text>
                  </View>
                )}
                <View style={styles.dayNumbers}>
                  <Text style={[styles.dayNum, { color: Colors.success }]}>{t}✓</Text>
                  {m > 0 && <Text style={[styles.dayNum, { color: Colors.danger }]}>{m}✗</Text>}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const StatRow = ({ color, label, value }) => (
  <View style={styles.statRow}>
    <View style={[styles.statDot, { backgroundColor: color }]} />
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    ...Shadow.sm,
  },
  title: { fontSize: Typography.headingLarge, fontWeight: Typography.weightBold, color: Colors.textPrimary },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: '#EEF4FF',
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  exportBtnText: { fontSize: Typography.bodyMedium, fontWeight: Typography.weightSemibold, color: Colors.primary },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  noPatient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  noPatientTitle: { fontSize: Typography.headingSmall, fontWeight: Typography.weightBold, color: Colors.textSecondary, marginTop: Spacing.md },
  rangeRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  rangeBtn: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radii.full, backgroundColor: Colors.surface, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border },
  rangeBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  rangeBtnText: { fontSize: Typography.bodyMedium, fontWeight: Typography.weightSemibold, color: Colors.textSecondary },
  rangeBtnTextActive: { color: Colors.white },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadow.md,
  },
  rateCircle: {
    width: 90,
    height: 90,
    borderRadius: Radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  rateValue: { fontSize: Typography.headingMedium, fontWeight: Typography.weightBold, color: Colors.white },
  rateLabel: { fontSize: Typography.caption, color: Colors.white + 'CC' },
  statsList: { flex: 1, gap: Spacing.xs },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  statDot: { width: 10, height: 10, borderRadius: 5 },
  statLabel: { flex: 1, fontSize: Typography.bodySmall, color: Colors.textSecondary },
  statValue: { fontSize: Typography.bodyMedium, fontWeight: Typography.weightBold },
  sectionTitle: { fontSize: Typography.bodyLarge, fontWeight: Typography.weightBold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  dayName: { width: 100, fontSize: Typography.bodySmall, fontWeight: Typography.weightMedium, color: Colors.textPrimary },
  noData: { flex: 1, fontSize: Typography.bodySmall, color: Colors.textMuted },
  dayStatsCol: { flex: 1, gap: 4 },
  dayBarBg: { height: 8, backgroundColor: Colors.border, borderRadius: Radii.full, overflow: 'hidden' },
  dayBar: { height: '100%', borderRadius: Radii.full },
  dayPercent: { fontSize: 11, color: Colors.textSecondary },
  dayNumbers: { flexDirection: 'row', gap: Spacing.xs },
  dayNum: { fontSize: Typography.bodySmall, fontWeight: Typography.weightBold },
});

export default CaregiverReportScreen;
