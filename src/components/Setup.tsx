import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { setPin } from '../utils/storage';

interface SetupProps {
  onComplete: () => void;
}

const Setup: React.FC<SetupProps> = ({ onComplete }) => {
  const [pin, setInputPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const handleSave = async () => {
    if (pin.length < 4) {
      Alert.alert('Error', 'PIN must be at least 4 digits');
      return;
    }
    if (pin !== confirmPin) {
      Alert.alert('Error', 'PINs do not match');
      return;
    }

    await setPin(pin);
    Alert.alert('Success', 'Vault setup complete!', [{ text: 'OK', onPress: onComplete }]);
  };

  return (
    <View style={styles.container}>
      <ShieldCheck color="#f1a33c" size={80} />
      <Text style={styles.title}>Secure Your Vault</Text>
      <Text style={styles.subtitle}>Set a secret PIN to access your hidden files.</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter 4-digit PIN"
          placeholderTextColor="#666"
          keyboardType="numeric"
          secureTextEntry
          maxLength={8}
          value={pin}
          onChangeText={setInputPin}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm PIN"
          placeholderTextColor="#666"
          keyboardType="numeric"
          secureTextEntry
          maxLength={8}
          value={confirmPin}
          onChangeText={setConfirmPin}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>Initialize Vault</Text>
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
