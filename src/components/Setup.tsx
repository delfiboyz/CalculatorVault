import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { PIN_MAX_LENGTH, PIN_MIN_LENGTH, isValidPinFormat, setPin } from '../security/pin';

interface SetupProps {
  onComplete: () => void;
}

const Setup: React.FC<SetupProps> = ({ onComplete }) => {
  const [pin, setInputPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!isValidPinFormat(pin)) {
      Alert.alert('Error', `PIN must be ${PIN_MIN_LENGTH}-${PIN_MAX_LENGTH} digits`);
      return;
    }
    if (/^(\d)\1+$/.test(pin) || '0123456789'.includes(pin) || '9876543210'.includes(pin)) {
      Alert.alert('Weak PIN', 'Avoid repeated or sequential digits like 1111 or 1234.');
      return;
    }
    if (pin !== confirmPin) {
      Alert.alert('Error', 'PINs do not match');
      return;
    }

    setSaving(true);
    try {
      await setPin(pin);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Could not save the PIN.');
      return;
    } finally {
      setSaving(false);
    }
    Alert.alert(
      'Vault ready',
      'To open the vault, type your PIN on the calculator and press "=". ' +
        'You can enable fingerprint/Face ID later in the vault settings.',
      [{ text: 'OK', onPress: onComplete }],
    );
  };

  return (
    <View style={styles.container}>
      <ShieldCheck color="#f1a33c" size={80} />
      <Text style={styles.title}>Secure Your Vault</Text>
      <Text style={styles.subtitle}>Set a secret PIN to access your hidden files.</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={`Enter ${PIN_MIN_LENGTH}-${PIN_MAX_LENGTH} digit PIN`}
          placeholderTextColor="#666"
          keyboardType="numeric"
          secureTextEntry
          autoComplete="off"
          maxLength={PIN_MAX_LENGTH}
          value={pin}
          onChangeText={setInputPin}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm PIN"
          placeholderTextColor="#666"
          keyboardType="numeric"
          secureTextEntry
          autoComplete="off"
          maxLength={PIN_MAX_LENGTH}
          value={confirmPin}
          onChangeText={setConfirmPin}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Initialize Vault</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
  },
  subtitle: {
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 30,
  },
  input: {
    backgroundColor: '#1f1f1f',
    color: '#fff',
    width: '100%',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 18,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#f1a33c',
    width: '100%',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default Setup;
