// src/screens/patient/MyMedicationsScreen.js
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../store/AuthContext';
import { getMedications, deleteMedication } from '../../services/medicationService';
import { Colors, Typography, Spacing, Radii, Shadow } from '../../utils/theme';

const MyMedicationsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [medications, setMedications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadMedications = useCallback(async () => {
    if (!user) return;
    const meds = await getMedications(user.uid);
    setMedications(meds);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadMedications();
    }, [loadMedications]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMedications();
    setRefreshing(false);
  };

  const handleDelete = (med) => {
    const confirmMsg = med.isCritical
      ? `⚠️ "${med.name}" is marked as Critical. Are you sure you want to delete it?`
      : `Delete "${med.name}"? This will cancel all future reminders.`;

    Alert.alert('Delete Medication', confirmMsg, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteMedication(user.uid, med.id);
          await loadMedications();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Medications</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AddMedication')}
          accessibilityLabel="Add new medication">
          <Icon name="plus" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={medications}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="close-circle-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No medications yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the + button to add your first medication
            </Text>
            <TouchableOpacity
              style={styles.addFirstBtn}
              onPress={() => navigation.navigate('AddMedication')}>
              <Text style={styles.addFirstBtnText}>Add Medication</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <MedicationCard
            med={item}
            onPress={() => navigation.navigate('MedicationDetail', { medId: item.id })}
            onEdit={() => navigation.navigate('EditMedication', { medId: item.id })}
            onDelete={() => handleDelete(item)}
          />
        )}
      />
    </SafeAreaView>
  );
};

const MedicationCard = ({ med, onPress, onEdit, onDelete }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
    <View style={[styles.cardIconCol, { backgroundColor: med.isCritical ? Colors.dangerLight : '#EEF4FF' }]}>
      <Icon name="pill" size={32} color={med.isCritical ? Colors.danger : Colors.primary} />
      {med.isCritical && (
        <View style={styles.criticalBadge}>
          <Icon name="alert" size={10} color={Colors.white} />
        </View>
      )}
    </View>

    <View style={styles.cardInfo}>
      <View style={styles.cardTitleRow}>
        <Text style={styles.cardName}>{med.name}</Text>
        {med.isCritical && (
          <View style={styles.criticalTag}>
            <Text style={styles.criticalTagText}>CRITICAL</Text>
          </View>
        )}
      </View>
      <Text style={styles.cardDosage}>{med.dosage}</Text>
      <Text style={styles.cardTimes}>
        {med.times.join('  •  ')}
      </Text>
      {med.pillCount > 0 && (
        <Text style={styles.cardPills}>
          <Icon name="pill-multiple" size={12} /> {med.pillCount} pills remaining
        </Text>
      )}
    </View>

    <View style={styles.cardActions}>
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={onEdit}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Icon name="pencil-outline" size={20} color={Colors.primary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.iconBtn}
        onPress={onDelete}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Icon name="trash-can-outline" size={20} color={Colors.danger} />
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
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
  title: {
    fontSize: Typography.headingLarge,
    fontWeight: Typography.weightBold,
    color: Colors.textPrimary,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: Radii.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadow.md,
  },
  list: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
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
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  addFirstBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  addFirstBtnText: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.weightBold,
    color: Colors.white,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    alignItems: 'center',
    ...Shadow.sm,
  },
  cardIconCol: {
    width: 60,
    height: 60,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    position: 'relative',
  },
  criticalBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: Radii.full,
    backgroundColor: Colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.xs },
  cardName: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.weightBold,
    color: Colors.textPrimary,
  },
  criticalTag: {
    backgroundColor: Colors.dangerLight,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  criticalTagText: {
    fontSize: 10,
    fontWeight: Typography.weightBold,
    color: Colors.danger,
  },
  cardDosage: {
    fontSize: Typography.bodyMedium,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cardTimes: {
    fontSize: Typography.bodyMedium,
    color: Colors.primary,
    marginTop: 4,
    fontWeight: Typography.weightMedium,
  },
  cardPills: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: 4,
  },
  cardActions: {
    gap: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MyMedicationsScreen;