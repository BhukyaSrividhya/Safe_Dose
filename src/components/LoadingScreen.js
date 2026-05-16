// src/components/LoadingScreen.js
import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography, Spacing } from '../utils/theme';

const LoadingScreen = ({ message = 'Loading...' }) => (
  <View style={styles.container}>
    <Icon name="pill" size={48} color={Colors.primary} style={styles.icon} />
    <ActivityIndicator size="large" color={Colors.primary} />
    <Text style={styles.message}>{message}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  icon: { marginBottom: Spacing.sm },
  message: {
    fontSize: Typography.bodyLarge,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});

export default LoadingScreen;
