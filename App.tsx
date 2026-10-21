import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as ScreenCapture from 'expo-screen-capture';
import Calculator from './src/components/Calculator';
import Vault from './src/components/Vault';
import Setup from './src/components/Setup';
import Settings from './src/components/Settings';
import { initializeVault, lockVault, openVault } from './src/utils/storage';
import { getLockedUntil, hasPin, resetFailedAttempts, verifyPin } from './src/security/pin';
import { isSecureStoreAvailable } from './src/security/secureStore';
import { authenticateWithBiometrics } from './src/security/biometrics';
import { DEFAULT_SETTINGS, SecuritySettings, getSettings, saveSettings } from './src/security/settings';
import { useAutoLock } from './src/hooks/useAutoLock';

type Screen = 'calculator' | 'vault' | 'settings';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [isSetup, setIsSetup] = useState(false);
  const [screen, setScreen] = useState<Screen>('calculator');
  const [settings, setSettings] = useState<SecuritySettings>(DEFAULT_SETTINGS);
  const unlocked = screen !== 'calculator';

  useEffect(() => {
    checkInitialState();
  }, []);

  const checkInitialState = async () => {
    try {
      if (!(await isSecureStoreAvailable())) {
        setUnavailable(true);
        return;
      }
      initializeVault();
      setIsSetup(await hasPin());
      setSettings(await getSettings());
    } catch (error) {
      console.error('Failed to initialize app:', error);
    } finally {
      setLoading(false);
    }
  };

  const lock = useCallback(() => {
    lockVault();
    setScreen('calculator');
  }, []);

  const enterVault = async () => {
    try {
      await openVault();
      setScreen('vault');
    } catch (error) {
      console.error('Failed to open vault:', error);
      lockVault();
    }
  };

  const handleUnlock = async (inputPin: string) => {
    const result = await verifyPin(inputPin);
    // Failures stay silent so the calculator never reveals that it is a vault.
    if (result.ok) await enterVault();
  };

  const handleBiometricUnlock = async () => {
    if (!settings.biometricUnlock || (await getLockedUntil())) return;
    if (await authenticateWithBiometrics('Unlock')) {
      await resetFailedAttempts();
      await enterVault();
    }
  };

  const handleSettingsChange = async (next: SecuritySettings) => {
    setSettings(next);
    await saveSettings(next);
  };

  const onActivity = useAutoLock(unlocked, settings.autoLockSeconds, lock);

  // While the vault is open: block screenshots/recording (Android FLAG_SECURE also
  // blanks the recent-apps preview) and blur the iOS app-switcher snapshot.
  useEffect(() => {
    if (!unlocked) return;
    if (settings.blockScreenCapture) {
      ScreenCapture.preventScreenCaptureAsync('vault').catch(() => {});
    }
    if (Platform.OS === 'ios') {
      ScreenCapture.enableAppSwitcherProtectionAsync(1).catch(() => {});
    }
    return () => {
      ScreenCapture.allowScreenCaptureAsync('vault').catch(() => {});
      if (Platform.OS === 'ios') {
        ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => {});
      }
    };
  }, [unlocked, settings.blockScreenCapture]);

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#f1a33c" />
        </View>
      );
    }
    if (unavailable) {
      return (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Secure storage is not available on this device.</Text>
        </View>
      );
    }
    if (!isSetup) {
      return <Setup onComplete={() => setIsSetup(true)} />;
    }
    switch (screen) {
      case 'calculator':
        return <Calculator onUnlock={handleUnlock} onBiometricUnlock={handleBiometricUnlock} />;
      case 'vault':
        return (
          <Vault onLock={lock} onOpenSettings={() => setScreen('settings')} onActivity={onActivity} />
        );
      case 'settings':
        return (
          <Settings
            settings={settings}
            onChange={handleSettingsChange}
            onBack={() => setScreen('vault')}
            onErased={lock}
          />
        );
    }
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container} onTouchStart={onActivity}>
        {renderContent()}
        <StatusBar style="light" />
      </View>
    </SafeAreaProvider>
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
    padding: 30,
  },
  errorText: {
    color: '#888',
    textAlign: 'center',
  },
});
