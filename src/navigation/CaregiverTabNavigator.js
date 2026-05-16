// src/navigation/CaregiverTabNavigator.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography } from '../utils/theme';

import CaregiverDashboardScreen from '../screens/caregiver/CaregiverDashboardScreen';
import CaregiverReportScreen from '../screens/caregiver/CaregiverReportScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();

const CaregiverTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ color, size }) => {
        const icons = {
          Dashboard: 'view-dashboard',
          Reports: 'chart-line',
          Profile: 'account-circle',
        };
        return <Icon name={icons[route.name]} size={size} color={color} />;
      },
      tabBarActiveTintColor: Colors.primary,
      tabBarInactiveTintColor: Colors.textMuted,
      tabBarStyle: { paddingBottom: 8, height: 64 },
      tabBarLabelStyle: { fontSize: Typography.caption, fontWeight: Typography.weightMedium },
      headerShown: false,
    })}>
    <Tab.Screen name="Dashboard" component={CaregiverDashboardScreen} />
    <Tab.Screen name="Reports" component={CaregiverReportScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

export default CaregiverTabNavigator;