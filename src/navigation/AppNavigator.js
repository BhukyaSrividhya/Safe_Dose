// src/navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../store/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '../utils/theme';

// Auth Screens
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import SignInScreen from '../screens/auth/SignInScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';

// Patient Screens
import PatientTabNavigator from './PatientTabNavigator';

// Caregiver Screens
import CaregiverTabNavigator from './CaregiverTabNavigator';

// Shared Modal Screens
import ConfirmDoseScreen from '../screens/patient/ConfirmDoseScreen';
import AddMedicationScreen from '../screens/patient/AddMedicationScreen';
import EditMedicationScreen from '../screens/patient/EditMedicationScreen';
import MedicationDetailScreen from '../screens/patient/MedicationDetailScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          // ── Auth Stack ──────────────────────────────────────
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </>
        ) : profile?.role === 'caregiver' ? (
          // ── Caregiver Stack ─────────────────────────────────
          // FIX: AddMedication, EditMedication, MedicationDetail were missing
          // from caregiver stack — caused silent navigation failure
          <>
            <Stack.Screen name="CaregiverTabs" component={CaregiverTabNavigator} />
            <Stack.Screen
              name="AddMedication"
              component={AddMedicationScreen}
              options={{ headerShown: true, title: 'Add Medication', headerBackTitleVisible: false }}
            />
            <Stack.Screen
              name="EditMedication"
              component={EditMedicationScreen}
              options={{ headerShown: true, title: 'Edit Medication', headerBackTitleVisible: false }}
            />
            <Stack.Screen
              name="MedicationDetail"
              component={MedicationDetailScreen}
              options={{ headerShown: true, title: 'Medication Details', headerBackTitleVisible: false }}
            />
          </>
        ) : (
          // ── Patient Stack ───────────────────────────────────
          <>
            <Stack.Screen name="PatientTabs" component={PatientTabNavigator} />
            <Stack.Screen
              name="ConfirmDose"
              component={ConfirmDoseScreen}
              options={{ presentation: 'modal', headerShown: false }}
            />
            <Stack.Screen
              name="AddMedication"
              component={AddMedicationScreen}
              options={{ headerShown: true, title: 'Add Medication', headerBackTitleVisible: false }}
            />
            <Stack.Screen
              name="EditMedication"
              component={EditMedicationScreen}
              options={{ headerShown: true, title: 'Edit Medication', headerBackTitleVisible: false }}
            />
            <Stack.Screen
              name="MedicationDetail"
              component={MedicationDetailScreen}
              options={{ headerShown: true, title: 'Medication Details', headerBackTitleVisible: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;