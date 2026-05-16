// src/navigation/PatientTabNavigator.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Colors, Typography } from '../utils/theme';

import PatientHomeScreen from '../screens/patient/PatientHomeScreen';
import MyMedicationsScreen from '../screens/patient/MyMedicationsScreen';
import AdherenceReportScreen from '../screens/patient/AdherenceReportScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';

const Tab = createBottomTabNavigator();

const PatientTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ color, size }) => {
        const icons = {
          Home: 'home-heart',
          Medications: 'pill',
          Reports: 'chart-bar',
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
    <Tab.Screen name="Home" component={PatientHomeScreen} />
    <Tab.Screen name="Medications" component={MyMedicationsScreen} />
    <Tab.Screen name="Reports" component={AdherenceReportScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

export default PatientTabNavigator;
