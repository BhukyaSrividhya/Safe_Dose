// src/components/PillIcon.js
// Color-codes medications by their category keyword.
// Falls back to a generic colored pill when no keyword matches.
// Used throughout the app for visual medication identification.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Radii } from '../utils/theme';

// Keyword → color mapping for common medication types
const MED_COLORS = {
  // Cardiac / Blood pressure
  amlodipine: '#E53935',
  atenolol: '#E53935',
  lisinopril: '#E53935',
  ramipril: '#E53935',
  aspirin: '#E53935',
  warfarin: '#E53935',
  // Diabetes
  metformin: '#1E88E5',
  insulin: '#1E88E5',
  glipizide: '#1E88E5',
  // Vitamins / supplements
  vitamin: '#43A047',
  calcium: '#43A047',
  iron: '#43A047',
  zinc: '#43A047',
  // Pain / anti-inflammatory
  ibuprofen: '#FB8C00',
  paracetamol: '#FB8C00',
  naproxen: '#FB8C00',
  // Thyroid
  thyroxine: '#8E24AA',
  levothyroxine: '#8E24AA',
  // Default
  default: '#546E7A',
};

const getColor = (name) => {
  const lower = (name || '').toLowerCase();
  for (const [keyword, color] of Object.entries(MED_COLORS)) {
    if (keyword !== 'default' && lower.includes(keyword)) return color;
  }
  return MED_COLORS.default;
};

const PillIcon = ({ name, size = 32, isCritical = false }) => {
  const color = isCritical ? '#C62828' : getColor(name);
  const bgColor = color + '22';

  return (
    <View style={[styles.circle, { backgroundColor: bgColor, width: size * 1.75, height: size * 1.75, borderRadius: (size * 1.75) / 2 }]}>
      <Icon name="pill" size={size} color={color} />
    </View>
  );
};

const styles = StyleSheet.create({
  circle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export { getColor };
export default PillIcon;
