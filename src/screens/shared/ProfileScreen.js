// src/screens/shared/ProfileScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Clipboard from '@react-native-clipboard/clipboard';
import { useAuth } from '../../store/AuthContext';
import { signOut } from '../../services/authService';
import { stopSyncListener } from '../../services/syncService';
import { clearAllTimers } from '../../services/missedDoseTimer';
import { Colors, Typography, Spacing, Radii, Shadow } from '../../utils/theme';

const ProfileScreen = () => {
  const { user, profile } = useAuth();
  const [copying, setCopying] = useState(false);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          stopSyncListener();
          clearAllTimers();
          await signOut();
        },
      },
    ]);
  };

  const handleCopyUID = async () => {
    Clipboard.setString(user.uid);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  const handleShareUID = async () => {
    await Share.share({
      message: `My SafeDose Patient ID: ${user.uid}\n\nUse this ID to link as my caregiver in the SafeDose app.`,
      title: 'Share SafeDose Patient ID',
    });
  };

  const isPatient = profile?.role === 'patient';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Avatar + name */}
        <View style={styles.avatarCard}>
          <View style={[styles.avatar, { backgroundColor: isPatient ? '#EEF4FF' : '#FFF3E0' }]}>
            <Icon
              name={isPatient ? 'walk' : 'account-heart'}
              size={48}
              color={isPatient ? Colors.primary : Colors.warning}
            />
          </View>
          <Text style={styles.displayName}>{profile?.name || user?.displayName || 'User'}</Text>
          <Text style={styles.email}>{profile?.email || user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{isPatient ? 'Patient' : 'Caregiver'}</Text>
          </View>
        </View>

        {/* Patient UID section — shown only to patients so caregivers can link */}
        {isPatient && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Patient ID</Text>
            <Text style={styles.sectionSubtitle}>
              Share this ID with your caregiver so they can link their account to monitor you.
            </Text>
            <View style={styles.uidBox}>
              <Text style={styles.uidText} selectable numberOfLines={1} ellipsizeMode="middle">
                {user?.uid}
              </Text>
            </View>
            <View style={styles.uidActions}>
              <TouchableOpacity style={styles.uidBtn} onPress={handleCopyUID}>
                <Icon name={copying ? 'check' : 'content-copy'} size={18} color={Colors.primary} />
                <Text style={styles.uidBtnText}>{copying ? 'Copied!' : 'Copy'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.uidBtn} onPress={handleShareUID}>
                <Icon name="share-variant" size={18} color={Colors.primary} />
                <Text style={styles.uidBtnText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Caregiver link info */}
        {!isPatient && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Monitoring</Text>
            <View style={styles.infoRow}>
              <Icon name="account" size={20} color={Colors.textSecondary} />
              <Text style={styles.infoText}>
                Patient ID: {profile?.caregiverForId
                  ? profile.caregiverForId.substring(0, 12) + '...'
                  : 'Not linked'}
              </Text>
            </View>
          </View>
        )}

        {/* Account info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <InfoRow icon="email-outline" label="Email" value={profile?.email || user?.email} />
          <InfoRow icon="calendar-outline" label="Member since" value={
            profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Unknown'
          } />
        </View>

        {/* App info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About SafeDose</Text>
          <InfoRow icon="shield-check-outline" label="Version" value="1.0.0" />
          <InfoRow icon="wifi-off" label="Mode" value="Offline-first" />
          <InfoRow icon="lock-outline" label="Encryption" value="AES-256" />
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Icon name="logout" size={22} color={Colors.danger} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <Icon name={icon} size={20} color={Colors.textSecondary} />
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    ...Shadow.sm,
  },
  title: { fontSize: Typography.headingLarge, fontWeight: Typography.weightBold, color: Colors.textPrimary },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  avatarCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadow.md,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: Radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  displayName: {
    fontSize: Typography.headingMedium,
    fontWeight: Typography.weightBold,
    color: Colors.textPrimary,
  },
  email: { fontSize: Typography.bodyLarge, color: Colors.textSecondary, marginTop: 4 },
  roleBadge: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    marginTop: Spacing.sm,
  },
  roleText: { fontSize: Typography.bodySmall, fontWeight: Typography.weightBold, color: Colors.white },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  sectionTitle: {
    fontSize: Typography.bodyLarge,
    fontWeight: Typography.weightBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  sectionSubtitle: { fontSize: Typography.bodySmall, color: Colors.textMuted, marginBottom: Spacing.sm },
  uidBox: {
    backgroundColor: Colors.background,
    borderRadius: Radii.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  uidText: {
    fontSize: Typography.bodyMedium,
    fontFamily: 'monospace',
    color: Colors.textSecondary,
  },
  uidActions: { flexDirection: 'row', gap: Spacing.sm },
  uidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: '#EEF4FF',
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  uidBtnText: { fontSize: Typography.bodyMedium, fontWeight: Typography.weightSemibold, color: Colors.primary },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  infoLabel: { flex: 1, fontSize: Typography.bodyMedium, color: Colors.textSecondary },
  infoText: { flex: 1, fontSize: Typography.bodyMedium, color: Colors.textPrimary },
  infoValue: { fontSize: Typography.bodyMedium, color: Colors.textPrimary, fontWeight: Typography.weightMedium },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.dangerLight,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.danger,
  },
  signOutText: { fontSize: Typography.bodyLarge, fontWeight: Typography.weightBold, color: Colors.danger },
});

export default ProfileScreen;
