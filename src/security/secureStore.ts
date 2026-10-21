import * as SecureStore from 'expo-secure-store';

// Secrets never leave this device: they are excluded from iCloud/Google backups
// and are only readable while the device is unlocked.
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export const KEYS = {
  pinRecord: 'cv_pin_record',
  masterKey: 'cv_master_key',
  attempts: 'cv_failed_attempts',
  intruderLog: 'cv_intruder_log',
  settings: 'cv_settings',
  // Plain-text PIN written by v1 of the app; migrated to a hash on first unlock.
  legacyPin: 'calculator_vault_pin',
} as const;

export const isSecureStoreAvailable = () => SecureStore.isAvailableAsync();

export const getSecret = (key: string) => SecureStore.getItemAsync(key, OPTIONS);

export const setSecret = (key: string, value: string) => SecureStore.setItemAsync(key, value, OPTIONS);

export const deleteSecret = (key: string) => SecureStore.deleteItemAsync(key, OPTIONS);

export const getJSON = async <T>(key: string, fallback: T): Promise<T> => {
  const raw = await getSecret(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const setJSON = (key: string, value: unknown) => setSecret(key, JSON.stringify(value));
