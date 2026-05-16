// src/components/OfflineBanner.js
// Shown at the top of screens when the device is offline.
// Reassures the user that reminders still work offline.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { Colors, Typography, Spacing } from '../utils/theme';

const OfflineBanner = () => {
  const isOnline = useNetworkStatus();

  if (isOnline) return null;

  return (
    <View style={styles.banner}>
      <Icon name="wifi-off" size={16} color={Colors.white} />
      <Text style={styles.text}>Offline — reminders still work normally</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: Colors.textSecondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  text: {
    fontSize: Typography.caption,
    color: Colors.white,
    fontWeight: '500',
  },
});

export default OfflineBanner;
