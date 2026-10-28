import { KEYS, getJSON, setJSON } from './secureStore';

export interface SecuritySettings {
  biometricUnlock: boolean;
  // Lock the vault after this many seconds without a touch; 0 disables the timer.
  autoLockSeconds: number;
  // Shown inside the vault: block screenshots and screen recording.
  blockScreenCapture: boolean;
}

export const DEFAULT_SETTINGS: SecuritySettings = {
  biometricUnlock: false,
  autoLockSeconds: 60,
  blockScreenCapture: true,
};

export const AUTO_LOCK_OPTIONS = [
  { label: '30 seconds', value: 30 },
  { label: '1 minute', value: 60 },
  { label: '5 minutes', value: 300 },
  { label: 'Never', value: 0 },
];

export const getSettings = async (): Promise<SecuritySettings> => ({
  ...DEFAULT_SETTINGS,
  ...(await getJSON<Partial<SecuritySettings>>(KEYS.settings, {})),
});

export const saveSettings = (settings: SecuritySettings) => setJSON(KEYS.settings, settings);
