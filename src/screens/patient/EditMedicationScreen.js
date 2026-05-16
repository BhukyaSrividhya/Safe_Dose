// src/screens/patient/EditMedicationScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useAuth } from '../../store/AuthContext';
import { getMedicationById } from '../../services/database';
import { editMedication } from '../../services/medicationService';
import { Colors, Typography, Spacing, Radii, Shadow } from '../../utils/theme';

const EditMedicationScreen = ({ route, navigation }) => {
  const { medId } = route.params;
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [times, setTimes] = useState([]);
  const [isCritical, setIsCritical] = useState(false);
  const [pillCount, setPillCount] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errors, setErrors] = useState({});

  const [showPicker, setShowPicker] = useState(false);
  const [editingTimeIndex, setEditingTimeIndex] = useState(null);
  const [pickerDate, setPickerDate] = useState(new Date());

  useEffect(() => {
    const load = async () => {
      const med = await getMedicationById(medId);
      if (med) {
        setName(med.name);
        setDosage(med.dosage);
        setTimes(med.times);
        setIsCritical(med.isCritical);
        setPillCount(med.pillCount > 0 ? String(med.pillCount) : '');
      }
      setFetching(false);
    };
    load();
  }, [medId]);

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Medication name is required';
    if (!dosage.trim()) errs.dosage = 'Dosage is required';
    if (times.length === 0) errs.times = 'Add at least one time';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddTime = () => {
    if (times.length >= 6) return;
    setTimes([...times, '12:00']);
  };

  const handleRemoveTime = (index) => {
    if (times.length === 1) return;
    setTimes(times.filter((_, i) => i !== index));
  };

  const openTimePicker = (index) => {
    setEditingTimeIndex(index);
    const [h, m] = times[index].split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    setPickerDate(d);
    setShowPicker(true);
  };

  const onTimeChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (event.type === 'dismissed') { setShowPicker(false); return; }
    if (selectedDate !== undefined && editingTimeIndex !== null) {
      const hh = String(selectedDate.getHours()).padStart(2, '0');
      const mm = String(selectedDate.getMinutes()).padStart(2, '0');
      const newTimes = [...times];
      newTimes[editingTimeIndex] = `${hh}:${mm}`;
      setTimes(newTimes.sort());
    }
    if (Platform.OS === 'ios') setShowPicker(false);
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await editMedication(user.uid, medId, {
        name: name.trim(),
        dosage: dosage.trim(),
        times,
        isCritical,
        pillCount: pillCount ? parseInt(pillCount, 10) : 0,
      });
      Alert.alert('Updated', `${name} has been updated.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', 'Could not update medication.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const formatTime12 = (time24) => {
    const [h, m] = time24.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m);
    return format(d, 'h:mm a');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <Text style={styles.fieldLabel}>Medication Name</Text>
        <TextInput
          style={[styles.input, errors.name && styles.inputError]}
          value={name}
          onChangeText={(t) => { setName(t); setErrors({ ...errors, name: null }); }}
          placeholder="Medication name"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="words"
        />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

        <Text style={styles.fieldLabel}>Dosage</Text>
        <TextInput
          style={[styles.input, errors.dosage && styles.inputError]}
          value={dosage}
          onChangeText={(t) => { setDosage(t); setErrors({ ...errors, dosage: null }); }}
          placeholder="e.g. 500mg, 1 tablet"
          placeholderTextColor={Colors.textMuted}
        />
        {errors.dosage && <Text style={styles.errorText}>{errors.dosage}</Text>}

        <Text style={styles.fieldLabel}>Reminder Times</Text>
        {times.map((time, index) => (
          <View key={index} style={styles.timeRow}>
            <TouchableOpacity style={styles.timeBtn} onPress={() => openTimePicker(index)}>
              <Icon name="clock-outline" size={22} color={Colors.primary} />
              <Text style={styles.timeText}>{formatTime12(time)}</Text>
              <Icon name="pencil" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.removeTimeBtn} onPress={() => handleRemoveTime(index)}>
              <Icon name="minus-circle" size={24} color={Colors.danger} />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={styles.addTimeBtn} onPress={handleAddTime}>
          <Icon name="plus-circle" size={22} color={Colors.primary} />
          <Text style={styles.addTimeBtnText}>Add Another Time</Text>
        </TouchableOpacity>

        <Text style={styles.fieldLabel}>Pill Count (optional)</Text>
        <TextInput
          style={styles.input}
          value={pillCount}
          onChangeText={setPillCount}
          placeholder="Current pill count"
          placeholderTextColor={Colors.textMuted}
          keyboardType="number-pad"
        />

        <View style={styles.criticalRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.criticalLabel}>Mark as Critical</Text>
            <Text style={styles.criticalDesc}>Alert in 5 min instead of 30 min</Text>
          </View>
          <Switch
            value={isCritical}
            onValueChange={setIsCritical}
            trackColor={{ false: Colors.border, true: Colors.danger + '88' }}
            thumbColor={isCritical ? Colors.danger : Colors.textMuted}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Icon name="content-save" size={22} color={Colors.white} />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>

      {showPicker && (
        <DateTimePicker
          value={pickerDate}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onTimeChange}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  fieldLabel: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.weightSemibold,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.bodyLarge,
    color: Colors.textPrimary,
    ...Shadow.sm,
  },
  inputError: { borderColor: Colors.danger },
  errorText: { fontSize: Typography.bodySmall, color: Colors.danger, marginTop: 4 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  timeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    ...Shadow.sm,
  },
  timeText: { flex: 1, fontSize: Typography.bodyLarge, fontWeight: Typography.weightSemibold, color: Colors.primary },
  removeTimeBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  addTimeBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  addTimeBtnText: { fontSize: Typography.bodyLarge, color: Colors.primary, fontWeight: Typography.weightMedium },
  criticalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
    ...Shadow.sm,
  },
  criticalLabel: { fontSize: Typography.bodyLarge, fontWeight: Typography.weightSemibold, color: Colors.textPrimary },
  criticalDesc: { fontSize: Typography.bodySmall, color: Colors.textMuted, marginTop: 2 },
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.xl,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    ...Shadow.md,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: Typography.headingSmall, fontWeight: Typography.weightBold, color: Colors.white },
});

export default EditMedicationScreen;
