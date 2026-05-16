// src/screens/auth/WelcomeScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, Radii, Shadow } from '../../utils/theme';

const WelcomeScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo / Icon */}
        <View style={styles.logoContainer}>
          <Icon name="pill" size={72} color={Colors.primary} />
          <Text style={styles.appName}>SafeDose</Text>
          <Text style={styles.tagline}>Smart Medication Adherence</Text>
        </View>

        {/* Feature highlights */}
        <View style={styles.features}>
          <FeatureRow icon="wifi-off" text="Works without internet" />
          <FeatureRow icon="alarm" text="Loud, clear medication alarms" />
          <FeatureRow icon="bell-alert" text="Alerts family if dose is missed" />
          <FeatureRow icon="account-heart" text="Simple, senior-friendly design" />
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('SignIn')}
            accessibilityLabel="Sign In">
            <Text style={styles.primaryBtnText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('SignUp')}
            accessibilityLabel="Create Account">
            <Text style={styles.secondaryBtnText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const FeatureRow = ({ icon, text }) => (
  <View style={styles.featureRow}>
    <Icon name={icon} size={24} color={Colors.primary} />
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  appName: {
    fontSize: Typography.displayLarge,
    fontWeight: Typography.weightBold,
    color: Colors.primary,
    marginTop: Spacing.sm,
  },
  tagline: {
    fontSize: Typography.bodyLarge,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  features: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    ...Shadow.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  featureText: {
    fontSize: Typography.bodyLarge,
    color: Colors.textPrimary,
    marginLeft: Spacing.md,
    fontWeight: Typography.weightMedium,
  },
  actions: {
    width: '100%',
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    ...Shadow.md,
  },
  primaryBtnText: {
    fontSize: Typography.headingSmall,
    fontWeight: Typography.weightBold,
    color: Colors.textOnPrimary,
  },
  secondaryBtn: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  secondaryBtnText: {
    fontSize: Typography.headingSmall,
    fontWeight: Typography.weightBold,
    color: Colors.primary,
  },
});

export default WelcomeScreen;
