import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../services/SupabaseClient';

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [franchiseId, setFranchiseId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle back button press to navigate to login
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        router.replace('/login'); // Navigate to login screen
        return true; // Prevent default back behavior
      };

      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress
      );

      return () => backHandler.remove();
    }, [router])
  );

  const handleSignup = async () => {
    setLoading(true);
    try {
      // Normalize & prefix franchise ID
      const raw = franchiseId.trim().toUpperCase();
      const frId = raw.startsWith('FR-') ? raw : `FR-${raw}`;

      // Build admin alias email: local+FRID@domain
      const [local, domain] = email.trim().split('@');
      if (!local || !domain) throw new Error('Invalid email format');
      const adminAlias = `${local}+${frId}@${domain}`;

      // 1️⃣ Create Admin user under alias
      const {
        data: adminData,
        error: adminError
      } = await supabase.auth.signUp({ email: adminAlias, password });
      if (adminError) throw adminError;
      const adminUser = adminData.user || adminData.session?.user;
      if (!adminUser?.id) throw new Error('Admin sign-up failed');

      // 2️⃣ Insert admin profile with real email + franchise
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: adminUser.id,
          name: name.trim(),
          email: email.trim(),
          franchise_id: frId,
        }]);
      if (profileError) throw profileError;

      // 3️⃣ Create Store user under generated store email
      const storeEmail = `store.${frId.toLowerCase()}@yourdomain.com`;
      const {
        data: storeData,
        error: storeError
      } = await supabase.auth.signUp({ email: storeEmail, password });

      // ignore "already registered", but upsert profile if newly created
      if (storeError) {
        const msg = storeError.message.toLowerCase();
        if (!msg.includes('already registered') && !msg.includes('duplicate')) {
          throw storeError;
        }
      } else if (storeData.user?.id) {
        // ensure store user has a profile for RLS
        await supabase
          .from('profiles')
          .upsert({
            id: storeData.user.id,
            franchise_id: frId,
          });
      }

      // 4️⃣ Sign out so Login starts fresh
      await supabase.auth.signOut();

      Alert.alert('Success', 'Account created! Please log in.');
      router.replace('/login');
    } catch (err: any) {
      console.error('Signup Error:', err);
      Alert.alert('Error', err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Create Franchise Account</Text>

          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
            placeholderTextColor="#999"
          />

          <TextInput
            style={styles.input}
            placeholder="Franchise ID (e.g. 1122 or FR-1122)"
            value={franchiseId}
            onChangeText={setFranchiseId}
            autoCapitalize="characters"
            placeholderTextColor="#999"
          />

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#999"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#999"
          />

          <Pressable
            style={[styles.button, loading && { opacity: 0.7 }]}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating...' : 'Sign Up'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const PRIMARY_COLOR = 'rgb(0, 100, 55)';
const LIGHT_GRAY = '#f2f2f2';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: PRIMARY_COLOR,
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    backgroundColor: LIGHT_GRAY,
    padding: 16,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#ddd',
    color: '#333',
  },
  button: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});