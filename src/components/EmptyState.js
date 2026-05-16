// src/components/EmptyState.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing, Radii, Shadow } from '../utils/theme';

const EmptyState = ({ icon, title, subtitle, actionLabel, onAction }) => (
  <View style={styles.container}>
    <View style={styles.iconCircle}>
      <Icon name={icon} size={52} color={Colors.textMuted} />
    </View>
    <Text style={styles.title}>{title}</Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    {actionLabel && onAction ? (
      <TouchableOpacity style={styles.btn} onPress={onAction}>
        <Text style={styles.btnText}>{actionLabel}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: Spacing.xl,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadow.sm,
  },
  title: {
    fontSize: Typography.headingSmall,
    fontWeight: Typography.weightBold,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.bodyLarge,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 26,
  },
  btn: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    ...Shadow.sm,
  },
  btnText: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.weightBold,
    color: Colors.white,
  },
});

export default EmptyState;
