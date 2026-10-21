import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CalculatorProps {
  onUnlock: (pin: string) => void;
  // Triggered by long-pressing "=", when biometric unlock is enabled.
  onBiometricUnlock: () => void;
}

const Calculator: React.FC<CalculatorProps> = ({ onUnlock, onBiometricUnlock }) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const size = Math.min(width, 500) / 4 - 20;
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);

  const calculate = (first: number, second: number, op: string) => {
    switch (op) {
      case '+': return first + second;
      case '-': return first - second;
      case '×': return first * second;
      case '÷': return second !== 0 ? first / second : 0;
      default: return second;
    }
  };

  const handlePress = (value: string) => {
    if (value === 'AC') {
      setDisplay('0');
      setPreviousValue(null);
      setOperator(null);
      setWaitingForNewValue(false);
    } else if (value === '+/-') {
      setDisplay(prev => {
        if (prev === '0') return '0';
        return prev.startsWith('-') ? prev.slice(1) : '-' + prev;
      });
    } else if (value === '%') {
      const current = parseFloat(display);
      setDisplay(String(current / 100));
    } else if (['+', '-', '×', '÷'].includes(value)) {
      const current = parseFloat(display);
      
      if (operator && !waitingForNewValue) {
        const result = calculate(previousValue || 0, current, operator);
        setDisplay(String(Number(result.toFixed(8))));
        setPreviousValue(result);
      } else {
        setPreviousValue(current);
      }
      
      setOperator(value);
      setWaitingForNewValue(true);
    } else if (value === '=') {
      if (!operator && /^\d+$/.test(display)) {
        // "=" on a bare number does nothing in a calculator, so only that is treated
        // as an unlock attempt. Normal calculations never count as failed PIN attempts.
        onUnlock(display);
      } else if (operator && previousValue !== null) {
        const current = parseFloat(display);
        const result = calculate(previousValue, current, operator);
        setDisplay(String(Number(result.toFixed(8))));
        setPreviousValue(null);
        setOperator(null);
        setWaitingForNewValue(true);
      }
    } else if (value === '.') {
      if (waitingForNewValue) {
        setDisplay('0.');
        setWaitingForNewValue(false);
      } else if (!display.includes('.')) {
        setDisplay(prev => prev + '.');
      }
    } else {
      // Digit buttons
      if (display === '0' || waitingForNewValue) {
        setDisplay(value);
        setWaitingForNewValue(false);
      } else {
        setDisplay(prev => prev + value);
      }
    }
  };

  const buttons = [
    ['AC', '+/-', '%', '÷'],
    ['7', '8', '9', '×'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['0', '.', '=']
  ];

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.displayContainer}>
        <Text style={styles.displayText} numberOfLines={1} adjustsFontSizeToFit>
          {display}
        </Text>
      </View>
      <View style={styles.buttonContainer}>
        {buttons.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((button) => (
              <TouchableOpacity
                key={button}
                style={[
                  styles.button,
                  { width: size, height: size, borderRadius: size / 2 },
                  button === '0' && [styles.zeroButton, { width: size * 2 + 20 }],
                  ['÷', '×', '-', '+', '='].includes(button) && styles.operatorButton,
                  ['AC', '+/-', '%'].includes(button) && styles.specialButton
                ]}
                onPress={() => handlePress(button)}
                onLongPress={button === '=' ? onBiometricUnlock : undefined}
              >
                <Text style={[
                  styles.buttonText,
                  ['AC', '+/-', '%'].includes(button) && styles.specialButtonText
                ]}>
                  {button}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'flex-end',
  },
  displayContainer: {
    padding: 20,
    alignItems: 'flex-end',
  },
  displayText: {
    color: '#fff',
    fontSize: 70,
    fontWeight: '300',
  },
  buttonContainer: {
    paddingBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zeroButton: {
    alignItems: 'flex-start',
    paddingLeft: 30,
  },
  operatorButton: {
    backgroundColor: '#f1a33c',
  },
  specialButton: {
    backgroundColor: '#a5a5a5',
  },
  buttonText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '400',
  },
  specialButtonText: {
    color: '#000',
  },
});

export default Calculator;
