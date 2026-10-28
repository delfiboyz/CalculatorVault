import * as LocalAuthentication from 'expo-local-authentication';
import { withExternalActivity } from './externalActivity';

export const isBiometricAvailable = async () =>
  (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());

export const authenticateWithBiometrics = async (promptMessage = 'Confirm your identity') => {
  if (!(await isBiometricAvailable())) return false;
  const result = await withExternalActivity(() =>
    LocalAuthentication.authenticateAsync({
      promptMessage,
      // Biometrics only: falling back to the device passcode would let anyone
      // who knows the phone's passcode bypass the vault PIN.
      disableDeviceFallback: true,
      cancelLabel: 'Cancel',
    }),
  );
  return result.success;
};
