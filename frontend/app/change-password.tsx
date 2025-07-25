// frontend/app/change-password.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../services/SupabaseClient';
import { Ionicons } from '@expo/vector-icons';

const SPACING = 12;
const PADDING = 16;
const INPUT_HEIGHT = 48;

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [oldAdminPwd, setOldAdminPwd] = useState('');
  const [newAdminPwd, setNewAdminPwd] = useState('');
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [showOldAdmin, setShowOldAdmin] = useState(false);
  const [showNewAdmin, setShowNewAdmin] = useState(false);

  const reauthAndUpdate = async (oldPwd: string, newPwd: string) => {
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user?.email) {
      throw new Error(userErr?.message || 'User not found');
    }

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPwd,
    });
    if (signInErr) throw new Error('Old password is incorrect');

    const { error: updErr } = await supabase.auth.updateUser({ password: newPwd });
    if (updErr) throw updErr;
  };

  const handleAdminSave = async () => {
    if (!oldAdminPwd || !newAdminPwd) {
      Alert.alert('Error', 'Please fill both fields');
      return;
    }
    setLoadingAdmin(true);
    try {
      await reauthAndUpdate(oldAdminPwd, newAdminPwd);
      Alert.alert('Success', 'Admin password changed');
      setOldAdminPwd('');
      setNewAdminPwd('');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoadingAdmin(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Back to Settings */}
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="rgb(0,100,55)" />
        </TouchableOpacity>

        <Image
          source={require('../assets/images/t-vanamm-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.column}>
          <Text style={styles.columnTitle}>Change Admin Password</Text>

          <Text style={styles.inputLabel}>Current Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.input}
              placeholder="Old password"
              secureTextEntry={!showOldAdmin}
              value={oldAdminPwd}
              onChangeText={setOldAdminPwd}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowOldAdmin(v => !v)}
            >
              <Ionicons
                name={showOldAdmin ? 'eye-off' : 'eye'}
                size={20}
                color="#777"
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.inputLabel, { marginTop: SPACING }]}>
            New Password
          </Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.input}
              placeholder="New password"
              secureTextEntry={!showNewAdmin}
              value={newAdminPwd}
              onChangeText={setNewAdminPwd}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowNewAdmin(v => !v)}
            >
              <Ionicons
                name={showNewAdmin ? 'eye-off' : 'eye'}
                size={20}
                color="#777"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loadingAdmin && styles.buttonDisabled]}
            onPress={handleAdminSave}
            disabled={loadingAdmin}
          >
            {loadingAdmin
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Save</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContainer: {
    flexGrow: 1,
    padding: PADDING,
    paddingTop: 40,
  },
  backButton: {
    marginBottom: SPACING,
    padding: 4,
  },
  logo: {
    width: 120,
    height: 70,
    alignSelf: 'center',
    marginBottom: 24,
  },
  column: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: PADDING,
    elevation: 3,
  },
  columnTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgb(0,100,55)',
    marginBottom: SPACING * 1.5,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  input: {
    flex: 1,
    height: INPUT_HEIGHT,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 12,
  },
  button: {
    marginTop: SPACING * 2,
    backgroundColor: 'rgb(0,100,55)',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
