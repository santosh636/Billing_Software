// frontend/app/(tabs)/test-print.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Print from 'expo-print';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

export default function TestPrintScreen() {
  const router = useRouter();

  async function handleTestPrint() {
    try {
      await Print.printAsync({
        html: `
          <html>
            <body style="font-family: sans-serif; text-align: center;">
              <h1>🖨️ Test Print</h1>
              <p>${new Date().toLocaleString()}</p>
            </body>
          </html>
        `,
      });
    } catch (e: any) {
      Alert.alert('Print failed', e.message);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Print Test</Text>
      <TouchableOpacity style={styles.button} onPress={handleTestPrint}>
        <Text style={styles.buttonText}>Send Test to Printer</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { marginTop: 12 }]}
        onPress={() => router.back()}
      >
        <Text style={styles.buttonText}>← Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
    color: 'rgb(0,100,55)',
  },
  button: {
    backgroundColor: 'rgb(0,100,55)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
