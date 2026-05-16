// src/screens/auth/SignInScreen.js
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
import { signIn } from '../../services/authService';
import { Colors, Typography, Spacing, Radii, Shadow } from '../../utils/theme';

const SignInScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email';
    if (!password) errs.password = 'Password is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSignIn = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await signIn({ email: email.trim().toLowerCase(), password });
      // Navigation handled automatically by AuthContext listener
    } catch (err) {
      const msg =
        err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found'
          ? 'Incorrect email or password.'
          : err.code === 'auth/too-many-requests'
          ? 'Too many attempts. Please try again later.'
          : 'Sign in failed. Please try again.';
      Alert.alert('Sign In Failed', msg);
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

          {/* Header */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={28} color={Colors.primary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Icon name="pill" size={48} color={Colors.primary} />
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to SafeDose</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
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
              placeholder="Your password"
              secureTextEntry={!showPassword}
              error={errors.password}
              rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowPassword(!showPassword)}
            />

            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSignIn}
              disabled={loading}
              accessibilityLabel="Sign In">
              {loading ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.replace('SignUp')}>
              <Text style={styles.footerLink}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ── Reusable input field component ────────────────────────────

const InputField = ({
  label,
  icon,
  error,
  rightIcon,
  onRightIconPress,
  ...props
}) => (
  <View style={inputStyles.wrapper}>
    <Text style={inputStyles.label}>{label}</Text>
    <View style={[inputStyles.inputRow, error && inputStyles.inputError]}>
      <Icon name={icon} size={22} color={error ? Colors.danger : Colors.textSecondary} />
      <TextInput
        style={inputStyles.input}
        placeholderTextColor={Colors.textMuted}
        {...props}
      />
      {rightIcon && (
        <TouchableOpacity onPress={onRightIconPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name={rightIcon} size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
    {error ? <Text style={inputStyles.errorText}>{error}</Text> : null}
  </View>
);

const inputStyles = StyleSheet.create({
  wrapper: { marginBottom: Spacing.md },
  label: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.weightSemibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  inputError: { borderColor: Colors.danger },
  input: {
    flex: 1,
    fontSize: Typography.bodyLarge,
    color: Colors.textPrimary,
    padding: 0,
  },
  errorText: {
    fontSize: Typography.bodySmall,
    color: Colors.danger,
    marginTop: Spacing.xs,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.xl, flexGrow: 1 },
  backBtn: { alignSelf: 'flex-start', marginBottom: Spacing.md },
  header: { alignItems: 'center', marginBottom: Spacing.xl },
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
  form: { gap: Spacing.xs },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: Spacing.lg },
  forgotText: {
    fontSize: Typography.bodyMedium,
    color: Colors.primary,
    fontWeight: Typography.weightMedium,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
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
  },
  footerText: {
    fontSize: Typography.bodyLarge,
    color: Colors.textSecondary,
  },
  footerLink: {
    fontSize: Typography.bodyLarge,
    color: Colors.primary,
    fontWeight: Typography.weightBold,
  },
});

export { InputField };
export default SignInScreen;
