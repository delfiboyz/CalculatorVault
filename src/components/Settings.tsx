import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Switch,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Fingerprint, KeyRound, ShieldAlert, Timer, EyeOff, Trash2 } from 'lucide-react-native';
import {
  IntruderEntry,
  PIN_MAX_LENGTH,
  PIN_MIN_LENGTH,
  clearIntruderLog,
  getIntruderLog,
  isValidPinFormat,
  setPin,
  verifyPin,
} from '../security/pin';
import { authenticateWithBiometrics, isBiometricAvailable } from '../security/biometrics';
import { AUTO_LOCK_OPTIONS, SecuritySettings } from '../security/settings';
import { eraseVault } from '../utils/storage';

interface SettingsProps {
  settings: SecuritySettings;
  onChange: (settings: SecuritySettings) => void;
  onBack: () => void;
  onErased: () => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, onChange, onBack, onErased }) => {
  const insets = useSafeAreaInsets();
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [intruders, setIntruders] = useState<IntruderEntry[]>([]);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [changingPin, setChangingPin] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvailable);
    getIntruderLog().then(setIntruders);
  }, []);

  const toggleBiometric = async (value: boolean) => {
    if (value && !(await authenticateWithBiometrics('Enable biometric unlock'))) return;
    onChange({ ...settings, biometricUnlock: value });
  };

  const handleChangePin = async () => {
    if (!isValidPinFormat(newPin)) {
      Alert.alert('Error', `New PIN must be ${PIN_MIN_LENGTH}-${PIN_MAX_LENGTH} digits`);
      return;
    }
    if (newPin !== confirmPin) {
      Alert.alert('Error', 'New PINs do not match');
      return;
    }
    setChangingPin(true);
    try {
      const result = await verifyPin(currentPin);
      if (!result.ok) {
        Alert.alert(
          'Error',
          result.lockedUntil
            ? `Too many wrong attempts. Try again after ${new Date(result.lockedUntil).toLocaleTimeString()}.`
            : 'Current PIN is incorrect',
        );
        return;
      }
      await setPin(newPin);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      Alert.alert('Success', 'PIN changed');
    } finally {
      setChangingPin(false);
    }
  };

  const handleClearLog = async () => {
    await clearIntruderLog();
    setIntruders([]);
  };

  const handleErase = () => {
    Alert.alert(
      'Erase vault',
      'This permanently destroys every file in the vault and its encryption key. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase everything',
          style: 'destructive',
          onPress: async () => {
            await eraseVault();
            onErased();
          },
        },
      ],
    );
  };

  const pinInput = (value: string, onChangeText: (v: string) => void, placeholder: string) => (
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor="#666"
      keyboardType="numeric"
      secureTextEntry
      autoComplete="off"
      maxLength={PIN_MAX_LENGTH}
      value={value}
      onChangeText={onChangeText}
    />
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={onBack}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Security</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }]}>
        <View style={styles.section}>
          <View style={styles.row}>
            <Fingerprint color="#f1a33c" size={22} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Biometric unlock</Text>
              <Text style={styles.rowSubtitle}>
                {biometricAvailable
                  ? 'Long-press "=" on the calculator'
                  : 'No fingerprint or Face ID enrolled on this device'}
              </Text>
            </View>
            <Switch
              value={settings.biometricUnlock}
              onValueChange={toggleBiometric}
              disabled={!biometricAvailable && !settings.biometricUnlock}
              trackColor={{ true: '#f1a33c' }}
            />
          </View>

          <View style={styles.row}>
            <EyeOff color="#f1a33c" size={22} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Block screenshots</Text>
              <Text style={styles.rowSubtitle}>Prevents screenshots and screen recording in the vault</Text>
            </View>
            <Switch
              value={settings.blockScreenCapture}
              onValueChange={(value) => onChange({ ...settings, blockScreenCapture: value })}
              trackColor={{ true: '#f1a33c' }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Timer color="#f1a33c" size={22} />
            <Text style={styles.sectionTitle}>Auto-lock when idle</Text>
          </View>
          <View style={styles.options}>
            {AUTO_LOCK_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.option, settings.autoLockSeconds === option.value && styles.optionActive]}
                onPress={() => onChange({ ...settings, autoLockSeconds: option.value })}
              >
                <Text style={styles.optionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.hint}>The vault always locks when you leave the app.</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <KeyRound color="#f1a33c" size={22} />
            <Text style={styles.sectionTitle}>Change PIN</Text>
          </View>
          {pinInput(currentPin, setCurrentPin, 'Current PIN')}
          {pinInput(newPin, setNewPin, 'New PIN')}
          {pinInput(confirmPin, setConfirmPin, 'Confirm new PIN')}
          <TouchableOpacity style={styles.button} onPress={handleChangePin} disabled={changingPin}>
            {changingPin ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Update PIN</Text>}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ShieldAlert color="#f1a33c" size={22} />
            <Text style={styles.sectionTitle}>Failed unlock attempts</Text>
          </View>
          {intruders.length === 0 ? (
            <Text style={styles.hint}>No failed attempts recorded.</Text>
          ) : (
            <>
              {intruders.slice(0, 10).map((entry) => (
                <Text key={entry.at} style={styles.logEntry}>
                  {new Date(entry.at).toLocaleString()}
                  {entry.lockedOut ? '  (during lockout)' : ''}
                </Text>
              ))}
              {intruders.length > 10 && <Text style={styles.hint}>…and {intruders.length - 10} more</Text>}
              <TouchableOpacity onPress={handleClearLog}>
                <Text style={styles.link}>Clear log</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={handleErase}>
          <Trash2 color="#fff" size={18} />
          <Text style={[styles.buttonText, { marginLeft: 8 }]}>Erase vault</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#1f1f1f',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    padding: 15,
  },
  section: {
    backgroundColor: '#1f1f1f',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rowText: {
    flex: 1,
    marginHorizontal: 10,
  },
  rowTitle: {
    color: '#fff',
    fontSize: 16,
  },
  rowSubtitle: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2c2c2c',
    marginRight: 8,
    marginBottom: 8,
  },
  optionActive: {
    backgroundColor: '#f1a33c',
  },
  optionText: {
    color: '#fff',
  },
  hint: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#2c2c2c',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#f1a33c',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dangerButton: {
    backgroundColor: '#c0392b',
  },
  logEntry: {
    color: '#ccc',
    fontSize: 13,
    paddingVertical: 3,
  },
  link: {
    color: '#f1a33c',
    marginTop: 10,
  },
});

export default Settings;
