import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Calculator from './src/components/Calculator';
import Vault from './src/components/Vault';
import Setup from './src/components/Setup';
import { initializeVault, getPin, verifyPin } from './src/utils/storage';

import * as SecureStore from 'expo-secure-store';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [isSetup, setIsSetup] = useState(false);
  const [isLocked, setIsLocked] = useState(true);

  useEffect(() => {
    // Small delay to ensure native modules are definitely ready
    const timer = setTimeout(() => {
      checkInitialState();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const checkInitialState = async () => {
    try {
      console.log('Checking SecureStore availability...');
      const isAvailable = await SecureStore.isAvailableAsync();
      if (!isAvailable) {
        console.error('SecureStore is not available on this device/environment');
        setLoading(false);
        return;
      }

      console.log('Initializing vault...');
      await initializeVault();
      
      console.log('Vault initialized. Fetching PIN...');
      const pin = await getPin();
      console.log('PIN fetched:', pin ? 'Exists' : 'Not set');
      setIsSetup(!!pin);
    } catch (error) {
      console.error('Failed to initialize app:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async (inputPin: string) => {
    const isValid = await verifyPin(inputPin);
    if (isValid) {
      setIsLocked(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#f1a33c" />
      </View>
    );
  }

  if (!isSetup) {
    return (
      <View style={styles.container}>
        <Setup onComplete={() => setIsSetup(true)} />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isLocked ? (
        <Calculator onUnlock={handleUnlock} />
      ) : (
        <Vault onLock={() => setIsLocked(true)} />
      )}
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
