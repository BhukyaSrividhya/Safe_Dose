// src/store/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, getUserProfile, updateFcmToken } from '../services/authService';
import messaging from '@react-native-firebase/messaging';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);       // Firebase user object
  const [profile, setProfile] = useState(null); // Firestore profile
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const prof = await getUserProfile(firebaseUser.uid);
        setProfile(prof);

        // Register FCM token
        try {
          const token = await messaging().getToken();
          if (token) await updateFcmToken(firebaseUser.uid, token);
        } catch (_) {}
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const refreshProfile = async () => {
    if (user) {
      const prof = await getUserProfile(user.uid);
      setProfile(prof);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
