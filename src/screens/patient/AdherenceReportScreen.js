// src/screens/patient/AdherenceReportScreen.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { subDays, startOfDay, endOfDay, format, eachDayOfInterval } from 'date-fns';
import { useAuth } from '../../store/AuthContext';
import { getDoseLogsRange } from '../../services/medicationService';
import { Colors, Typography, Spacing, Radii, Shadow } from '../../utils/theme';

const RANGES = [
  { label: '7 Days', days: 7 },
  { label: '14 Days', days: 14 },
  { label: '30 Days', days: 30 },
];

const AdherenceReportScreen = () => {
  const { user } = useAuth();
  const [selectedRange, setSelectedRange] = useState(7);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadReport = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const from = startOfDay(subDays(new Date(), selectedRange - 1)).toISOString();
    const to = endOfDay(new Date()).toISOString();
    const data = await getDoseLogsRange(user.uid, from, to);
    setLogs(data);
    setLoading(false);
  }, [user, selectedRange]);

  useFocusEffect(
    useCallback(() => {
      loadReport();
    }, [loadReport]),
  );

  // Compute summary
  const completed = logs.filter((l) => l.status !== 'pending');
  const taken = completed.filter((l) => l.status === 'taken' || l.status === 'late').length;
  const missed = completed.filter((l) => l.status === 'missed').length;
  const late = completed.filter((l) => l.status === 'late').length;
  const total = completed.length;
  const rate = total > 0 ? Math.round((taken / total) * 100) : null;

  // Build day-by-day breakdown
  const days = eachDayOfInterval({
    start: subDays(new Date(), selectedRange - 1),
    end: new Date(),
  });

  const dayStats = days.map((day) => {
    const dayLogs = completed.filter(
      (l) => new Date(l.scheduledTime) >= startOfDay(day) &&
             new Date(l.scheduledTime) <= endOfDay(day),
    );
    const dayTaken = dayLogs.filter((l) => l.status === 'taken' || l.status === 'late').length;
    const dayMissed = dayLogs.filter((l) => l.status === 'missed').length;
    return { day, taken: dayTaken, missed: dayMissed, total: dayLogs.length };
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Adherence Report</Text>
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
              <View style={styles.rateCircle}>
                <Text style={styles.rateValue}>{rate !== null ? `${rate}%` : 'N/A'}</Text>
                <Text style={styles.rateLabel}>Adherence</Text>
              </View>
              <View style={styles.statsList}>
                <StatRow icon="check-circle" color={Colors.success} label="Taken on time" value={taken - late} />
                <StatRow icon="clock-alert" color={Colors.warning} label="Taken late" value={late} />
                <StatRow icon="alert-circle" color={Colors.danger} label="Missed" value={missed} />
                <StatRow icon="sigma" color={Colors.primary} label="Total doses" value={total} />
              </View>
            </View>

            {/* Bar chart (simple) */}
            <Text style={styles.sectionTitle}>Daily Breakdown</Text>
            <View style={styles.chartCard}>
              <View style={styles.bars}>
                {dayStats.map(({ day, taken: t, missed: m, total: tot }) => {
                  const height = tot > 0 ? Math.max(4, (t / tot) * 80) : 4;
                  const missedHeight = tot > 0 ? Math.max(0, (m / tot) * 80) : 0;
                  return (
                    <View key={day.toISOString()} style={styles.barCol}>
                      <View style={styles.barStack}>
                        {missedHeight > 0 && (
                          <View style={[styles.bar, { height: missedHeight, backgroundColor: Colors.danger }]} />
                        )}
                        <View style={[styles.bar, { height, backgroundColor: Colors.success }]} />
                      </View>
                      <Text style={styles.barLabel}>{format(day, 'dd')}</Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.legend}>
                <LegendDot color={Colors.success} label="Taken" />
                <LegendDot color={Colors.danger} label="Missed" />
              </View>
            </View>

            {/* Daily detail table */}
            <Text style={styles.sectionTitle}>Day-by-Day Details</Text>
            {dayStats.reverse().map(({ day, taken: t, missed: m, total: tot }) => (
              <View key={day.toISOString()} style={styles.dayRow}>
                <Text style={styles.dayName}>{format(day, 'EEE, d MMM')}</Text>
                {tot === 0 ? (
                  <Text style={styles.noData}>No data</Text>
                ) : (
                  <View style={styles.dayStats}>
                    <Text style={[styles.dayStatNum, { color: Colors.success }]}>{t} taken</Text>
                    {m > 0 && (
                      <Text style={[styles.dayStatNum, { color: Colors.danger }]}>{m} missed</Text>
                    )}
                  </View>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const StatRow = ({ icon, color, label, value }) => (
  <View style={styles.statRow}>
    <Icon name={icon} size={18} color={color} />
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
  </View>
);

const LegendDot = ({ color, label }) => (
  <View style={styles.legendItem}>
    <View style={[styles.legendDot, { backgroundColor: color }]} />
    <Text style={styles.legendLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    ...Shadow.sm,
  },
  title: { fontSize: Typography.headingLarge, fontWeight: Typography.weightBold, color: Colors.textPrimary },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  rangeRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  rangeBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
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
    width: 100,
    height: 100,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
    ...Shadow.sm,
  },
  rateValue: { fontSize: Typography.headingLarge, fontWeight: Typography.weightBold, color: Colors.white },
  rateLabel: { fontSize: Typography.bodySmall, color: Colors.white + 'CC' },
  statsList: { flex: 1, gap: Spacing.xs },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  statLabel: { flex: 1, fontSize: Typography.bodyMedium, color: Colors.textSecondary },
  statValue: { fontSize: Typography.bodyLarge, fontWeight: Typography.weightBold },
  sectionTitle: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.weightBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 4, marginBottom: Spacing.sm },
  barCol: { flex: 1, alignItems: 'center' },
  barStack: { flexDirection: 'column-reverse', alignItems: 'center', gap: 2 },
  bar: { width: '100%', borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 4 },
  legend: { flexDirection: 'row', gap: Spacing.md, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: Typography.caption, color: Colors.textSecondary },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    ...Shadow.sm,
  },
  dayName: { flex: 1, fontSize: Typography.bodyMedium, fontWeight: Typography.weightMedium, color: Colors.textPrimary },
  noData: { fontSize: Typography.bodySmall, color: Colors.textMuted },
  dayStats: { flexDirection: 'row', gap: Spacing.sm },
  dayStatNum: { fontSize: Typography.bodySmall, fontWeight: Typography.weightSemibold },
});

export default AdherenceReportScreen;
