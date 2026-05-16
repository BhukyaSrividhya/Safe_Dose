// src/screens/patient/AddMedicationScreen.js
import React, { useState } from 'react';
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
import { createMedication } from '../../services/medicationService';
import { Colors, Typography, Spacing, Radii, Shadow } from '../../utils/theme';

const AddMedicationScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [times, setTimes] = useState(['08:00']);
  const [isCritical, setIsCritical] = useState(false);
  const [pillCount, setPillCount] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Time picker state
  const [showPicker, setShowPicker] = useState(false);
  const [editingTimeIndex, setEditingTimeIndex] = useState(null);
  const [pickerDate, setPickerDate] = useState(new Date());

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Medication name is required';
    if (!dosage.trim()) errs.dosage = 'Dosage is required (e.g. 500mg)';
    if (times.length === 0) errs.times = 'Add at least one reminder time';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddTime = () => {
    if (times.length >= 6) {
      Alert.alert('Maximum Times', 'You can add up to 6 reminder times per medication.');
      return;
    }
    setTimes([...times, '12:00']);
  };

  const handleRemoveTime = (index) => {
    if (times.length === 1) {
      Alert.alert('Cannot Remove', 'At least one reminder time is required.');
      return;
    }
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
      setPickerDate(selectedDate);
    }
    if (Platform.OS === 'ios') setShowPicker(false);
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await createMedication(user.uid, {
        name: name.trim(),
        dosage: dosage.trim(),
        times,
        isCritical,
        pillCount: pillCount ? parseInt(pillCount, 10) : 0,
      });
      Alert.alert(
        'Medication Added',
        `${name} has been added. Reminders are scheduled for ${times.join(', ')}.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err) {
      Alert.alert('Error', 'Could not save medication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Medication Name */}
        <FieldLabel label="Medication Name" error={errors.name} />
        <TextInput
          style={[styles.input, errors.name && styles.inputError]}
          value={name}
          onChangeText={(t) => { setName(t); setErrors({ ...errors, name: null }); }}
          placeholder="e.g. Metformin, Amlodipine"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="words"
        />
        {errors.name && <ErrorText text={errors.name} />}

        {/* Dosage */}
        <FieldLabel label="Dosage" error={errors.dosage} />
        <TextInput
          style={[styles.input, errors.dosage && styles.inputError]}
          value={dosage}
          onChangeText={(t) => { setDosage(t); setErrors({ ...errors, dosage: null }); }}
          placeholder="e.g. 500mg, 1 tablet, 5ml"
          placeholderTextColor={Colors.textMuted}
        />
        {errors.dosage && <ErrorText text={errors.dosage} />}

        {/* Reminder Times */}
        <FieldLabel label="Reminder Times" error={errors.times} />
        {errors.times && <ErrorText text={errors.times} />}

        {times.map((time, index) => (
          <View key={index} style={styles.timeRow}>
            <TouchableOpacity
              style={styles.timeBtn}
              onPress={() => openTimePicker(index)}>
              <Icon name="clock-outline" size={22} color={Colors.primary} />
              <Text style={styles.timeText}>{formatTime12(time)}</Text>
              <Icon name="pencil" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.removeTimeBtn}
              onPress={() => handleRemoveTime(index)}>
              <Icon name="minus-circle" size={24} color={Colors.danger} />
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.addTimeBtn} onPress={handleAddTime}>
          <Icon name="plus-circle" size={22} color={Colors.primary} />
          <Text style={styles.addTimeBtnText}>Add Another Time</Text>
        </TouchableOpacity>

        {/* Pill Count (optional) */}
        <FieldLabel label="Pill Count (optional)" />
        <TextInput
          style={styles.input}
          value={pillCount}
          onChangeText={setPillCount}
          placeholder="e.g. 30 — for refill reminder tracking"
          placeholderTextColor={Colors.textMuted}
          keyboardType="number-pad"
        />
        <Text style={styles.helperText}>
          A refill reminder will fire 5 days before your stock runs out.
        </Text>

        {/* Critical Flag */}
        <View style={styles.criticalRow}>
          <View style={styles.criticalTextCol}>
            <Text style={styles.criticalLabel}>Mark as Critical</Text>
            <Text style={styles.criticalDesc}>
              Missed dose alert sent in 5 min instead of 30 min
            </Text>
          </View>
          <Switch
            value={isCritical}
            onValueChange={setIsCritical}
            trackColor={{ false: Colors.border, true: Colors.danger + '88' }}
            thumbColor={isCritical ? Colors.danger : Colors.textMuted}
          />
        </View>

        {isCritical && (
          <View style={styles.criticalWarning}>
            <Icon name="alert" size={18} color={Colors.danger} />
            <Text style={styles.criticalWarningText}>
              Only mark as Critical for time-sensitive medicines like insulin or blood thinners.
              Use sparingly to avoid alert fatigue.
            </Text>
          </View>
        )}

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <Icon name="content-save" size={22} color={Colors.white} />
              <Text style={styles.saveBtnText}>Save Medication</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>

      {/* Time Picker */}
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

// ── Helpers ───────────────────────────────────────────────────

const FieldLabel = ({ label }) => (
  <Text style={styles.fieldLabel}>{label}</Text>
);

const ErrorText = ({ text }) => (
  <Text style={styles.errorText}>{text}</Text>
);

const formatTime12 = (time24) => {
  const [h, m] = time24.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m);
  return format(d, 'h:mm a');
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
  errorText: {
    fontSize: Typography.bodySmall,
    color: Colors.danger,
    marginTop: Spacing.xs,
  },
  helperText: {
    fontSize: Typography.caption,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
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
  timeText: {
    flex: 1,
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.weightSemibold,
    color: Colors.primary,
  },
  removeTimeBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addTimeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  addTimeBtnText: {
    fontSize: Typography.bodyLarge,
    color: Colors.primary,
    fontWeight: Typography.weightMedium,
  },
  criticalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginTop: Spacing.md,
    ...Shadow.sm,
  },
  criticalTextCol: { flex: 1 },
  criticalLabel: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.weightSemibold,
    color: Colors.textPrimary,
  },
  criticalDesc: {
    fontSize: Typography.bodySmall,
    color: Colors.textMuted,
    marginTop: 2,
  },
  criticalWarning: {
    flexDirection: 'row',
    backgroundColor: Colors.dangerLight,
    borderRadius: Radii.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  criticalWarningText: {
    flex: 1,
    fontSize: Typography.bodySmall,
    color: Colors.danger,
  },
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
  saveBtnText: {
    fontSize: Typography.headingSmall,
    fontWeight: Typography.weightBold,
    color: Colors.white,
  },
});

export default AddMedicationScreen;
