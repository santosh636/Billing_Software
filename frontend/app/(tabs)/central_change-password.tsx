// frontend/app/change-password.tsx
import React, { useState, useCallback } from 'react';
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
  BackHandler,
  Animated,
  Dimensions,
} from 'react-native';
import { supabase } from '../../services/SupabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';

const { width } = Dimensions.get('window');
const SPACING = 20;
const PADDING = 24;
const INPUT_HEIGHT = 56;
const PRIMARY_COLOR = 'rgb(0,100,55)';
const PRIMARY_LIGHT = 'rgba(0,100,55,0.1)';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [shakeAnim] = useState(new Animated.Value(0));

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

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

  const handleSave = async () => {
    if (!oldPwd || !newPwd) {
      shake();
      Alert.alert('Error', 'Please fill both fields');
      return;
    }
    
    if (newPwd.length < 6) {
      shake();
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await reauthAndUpdate(oldPwd, newPwd);
      
      Alert.alert('Success', 'Password changed successfully!', [
        { text: 'OK', onPress: () => {
          setOldPwd('');
          setNewPwd('');
          router.replace('/(tabs)/central_settings');
        }}
      ]);
    } catch (e: any) {
      shake();
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        router.replace('/(tabs)/central_settings');
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => subscription.remove();
    }, [router])
  );

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Animated.View style={[styles.logoContainer, {
            transform: [{ translateX: shakeAnim }]
          }]}>
            <Image
              source={require('../../assets/images/t-vanamm-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>

          <Animated.View style={[styles.card, {
            transform: [{ translateX: shakeAnim }]
          }]}>
            <Text style={styles.title}>Change Password</Text>
            <Text style={styles.subtitle}>Secure your account with a new password</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CURRENT PASSWORD</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#aaa"
                  secureTextEntry={!showOldPwd}
                  value={oldPwd}
                  onChangeText={setOldPwd}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowOldPwd(v => !v)}
                >
                  <Ionicons
                    name={showOldPwd ? 'eye-off' : 'eye'}
                    size={22}
                    color={PRIMARY_COLOR}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>NEW PASSWORD</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#aaa"
                  secureTextEntry={!showNewPwd}
                  value={newPwd}
                  onChangeText={setNewPwd}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowNewPwd(v => !v)}
                >
                  <Ionicons
                    name={showNewPwd ? 'eye-off' : 'eye'}
                    size={22}
                    color={PRIMARY_COLOR}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>UPDATE PASSWORD</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.buttonIcon} />
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.replace('/(tabs)/central_settings')}
          >
            <Ionicons name="chevron-back" size={24} color={PRIMARY_COLOR} />
            <Text style={styles.backText}>Back to Settings</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: PADDING,
    paddingTop: 60,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 150,
    height: 80,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: PADDING,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: PRIMARY_COLOR,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: SPACING,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: PRIMARY_COLOR,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 16,
    height: INPUT_HEIGHT,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 8,
  },
  button: {
    marginTop: 30,
    borderRadius: 10,
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  buttonIcon: {
    marginLeft: 10
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    padding: 10,
  },
  backText: {
    color: PRIMARY_COLOR,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 5,
  },
});