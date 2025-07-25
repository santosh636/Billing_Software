// frontend/app/(tabs)/settings.tsx

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, BackHandler, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const router = useRouter();

  // intercept back to go Dashboard
  useFocusEffect(
    React.useCallback(() => {
      const onBack = () => {
        router.replace('/(tabs)/admin-dashboard-billing');
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
      return () => sub.remove();
    }, [router])
  );

  const handleMenuEditor = () => {
    router.push('/menu-editor');
  };

  const handleChangePassword = () => {
    router.push('/change-password');
  };

  const handleLogout = () => {
    // TODO: Clear auth tokens or session
    router.replace('/login');
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>SETTINGS</Text>
        </View>

        {/* Menu Management Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="restaurant-menu" size={24} color="#4CAF50" />
            <Text style={styles.cardTitle}>Menu Management</Text>
          </View>
          <TouchableOpacity 
            style={styles.cardButton} 
            onPress={handleMenuEditor} 
            activeOpacity={0.8}
          >
            <Text style={styles.cardButtonText}>Menu Editor</Text>
            <MaterialIcons name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Security Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="security" size={24} color="#2196F3" />
            <Text style={styles.cardTitle}>Security</Text>
          </View>
          <TouchableOpacity 
            style={styles.cardButton} 
            onPress={handleChangePassword} 
            activeOpacity={0.8}
          >
            <Text style={styles.cardButtonText}>Change Password</Text>
            <MaterialIcons name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Logout Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="exit-to-app" size={24} color="#F44336" />
            <Text style={styles.cardTitle}>Account</Text>
          </View>
          <TouchableOpacity 
            style={[styles.cardButton, styles.logoutButton]} 
            onPress={handleLogout} 
            activeOpacity={0.8}
          >
            <Text style={[styles.cardButtonText, styles.logoutButtonText]}>Logout</Text>
            <MaterialIcons name="logout" size={24} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#f8faf8',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#006400',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginLeft: 12,
  },
  cardButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  cardButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  logoutButton: {
    backgroundColor: '#ffeeee',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  logoutButtonText: {
    color: '#F44336',
  },
});