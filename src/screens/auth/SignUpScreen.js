// src/screens/auth/SignUpScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { signUp } from '../../services/authService';
import { Colors, Typography, Spacing, Radii, Shadow } from '../../utils/theme';
import { InputField } from './SignInScreen';

const SignUpScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('patient'); // 'patient' | 'caregiver'
  const [caregiverForId, setCaregiverForId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Full name is required';
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email';
    if (!password) errs.password = 'Password is required';
    else if (password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
    if (role === 'caregiver' && !caregiverForId.trim())
      errs.caregiverForId = "Enter the patient's User ID";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await signUp({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        caregiverForId: role === 'caregiver' ? caregiverForId.trim() : null,
      });
      // Navigation handled automatically by AuthContext
    } catch (err) {
      const msg =
        err.code === 'auth/email-already-in-use'
          ? 'An account with this email already exists.'
          : err.code === 'auth/weak-password'
          ? 'Password is too weak. Use at least 8 characters.'
          : 'Account creation failed. Please try again.';
      Alert.alert('Sign Up Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled">

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={28} color={Colors.primary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Icon name="account-plus" size={48} color={Colors.primary} />
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join SafeDose today</Text>
          </View>

          {/* Role selector */}
          <Text style={styles.roleLabel}>I am a:</Text>
          <View style={styles.roleRow}>
            <RoleCard
              icon="walk"
              label="Patient"
              description="I take medications"
              selected={role === 'patient'}
              onPress={() => setRole('patient')}
            />
            <RoleCard
              icon="account-heart"
              label="Caregiver"
              description="I monitor someone"
              selected={role === 'caregiver'}
              onPress={() => setRole('caregiver')}
            />
          </View>

          {/* Form fields */}
          <View style={styles.form}>
            <InputField
              label="Full Name"
              icon="account-outline"
              value={name}
              onChangeText={(t) => { setName(t); setErrors({ ...errors, name: null }); }}
              placeholder="Your full name"
              autoCapitalize="words"
              error={errors.name}
            />

            <InputField
              label="Email Address"
              icon="email-outline"
              value={email}
              onChangeText={(t) => { setEmail(t); setErrors({ ...errors, email: null }); }}
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />

            <InputField
              label="Password"
              icon="lock-outline"
              value={password}
              onChangeText={(t) => { setPassword(t); setErrors({ ...errors, password: null }); }}
              placeholder="At least 8 characters"
              secureTextEntry={!showPassword}
              error={errors.password}
              rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowPassword(!showPassword)}
            />

            <InputField
              label="Confirm Password"
              icon="lock-check-outline"
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); setErrors({ ...errors, confirmPassword: null }); }}
              placeholder="Repeat your password"
              secureTextEntry={!showPassword}
              error={errors.confirmPassword}
            />

            {role === 'caregiver' && (
              <InputField
                label="Patient's User ID"
                icon="account-key-outline"
                value={caregiverForId}
                onChangeText={(t) => { setCaregiverForId(t); setErrors({ ...errors, caregiverForId: null }); }}
                placeholder="Ask the patient for their User ID"
                autoCapitalize="none"
                error={errors.caregiverForId}
              />
            )}

            {role === 'caregiver' && (
              <View style={styles.infoBox}>
                <Icon name="information-outline" size={20} color={Colors.primary} />
                <Text style={styles.infoText}>
                  Ask the patient to share their User ID from their Profile screen.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSignUp}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.replace('SignIn')}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const RoleCard = ({ icon, label, description, selected, onPress }) => (
  <TouchableOpacity
    style={[roleStyles.card, selected && roleStyles.cardSelected]}
    onPress={onPress}
    accessibilityLabel={label}>
    <Icon name={icon} size={36} color={selected ? Colors.primary : Colors.textMuted} />
    <Text style={[roleStyles.label, selected && roleStyles.labelSelected]}>{label}</Text>
    <Text style={roleStyles.description}>{description}</Text>
    {selected && (
      <Icon name="check-circle" size={20} color={Colors.primary} style={roleStyles.check} />
    )}
  </TouchableOpacity>
);

const roleStyles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
    marginHorizontal: Spacing.xs,
    position: 'relative',
    ...Shadow.sm,
  },
  cardSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#EEF4FF',
  },
  label: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.weightBold,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  labelSelected: { color: Colors.primary },
  description: {
    fontSize: Typography.bodySmall,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  check: { position: 'absolute', top: 8, right: 8 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.xl, flexGrow: 1 },
  backBtn: { alignSelf: 'flex-start', marginBottom: Spacing.md },
  header: { alignItems: 'center', marginBottom: Spacing.lg },
  title: {
    fontSize: Typography.displayMedium,
    fontWeight: Typography.weightBold,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  subtitle: {
    fontSize: Typography.bodyLarge,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  roleLabel: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.weightSemibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  roleRow: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  form: { gap: Spacing.xs },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EEF4FF',
    borderRadius: Radii.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.bodyMedium,
    color: Colors.primary,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
    ...Shadow.md,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: {
    fontSize: Typography.headingSmall,
    fontWeight: Typography.weightBold,
    color: Colors.textOnPrimary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  footerText: { fontSize: Typography.bodyLarge, color: Colors.textSecondary },
  footerLink: {
    fontSize: Typography.bodyLarge,
    color: Colors.primary,
    fontWeight: Typography.weightBold,
  },
});

export default SignUpScreen;
