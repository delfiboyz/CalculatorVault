import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';

const PIN_KEY = 'calculator_vault_pin';
export const VAULT_DIR = `${FileSystem.documentDirectory}vault/`;

export const categories = ['Photos', 'Videos', 'Documents'] as const;
export type Category = 'Photos' | 'Videos' | 'Documents';

export const initializeVault = async () => {
  const vaultInfo = await FileSystem.getInfoAsync(VAULT_DIR);
  if (!vaultInfo.exists) {
    await FileSystem.makeDirectoryAsync(VAULT_DIR, { intermediates: true });
  }

  for (const category of categories) {
    const catDir = `${VAULT_DIR}${category}/`;
    const catInfo = await FileSystem.getInfoAsync(catDir);
    if (!catInfo.exists) {
      await FileSystem.makeDirectoryAsync(catDir, { intermediates: true });
    }
  }
};

export const setPin = async (pin: string) => {
  await SecureStore.setItemAsync(PIN_KEY, pin);
};

export const getPin = async () => {
  return await SecureStore.getItemAsync(PIN_KEY);
};

export const verifyPin = async (inputPin: string) => {
  const savedPin = await getPin();
  return savedPin === inputPin;
};

export const addToVault = async (sourceUri: string, category: Category) => {
  const fileName = sourceUri.split('/').pop();
  const destUri = `${VAULT_DIR}${category}/${fileName}`;
  
  // Move file from source to private vault
  await FileSystem.copyAsync({
    from: sourceUri,
    to: destUri,
  });
  
  // Optional: Delete original file if it was a copy from a specific place
  // Note: For ImagePicker files on Android, they are usually temporary.
};

export const getVaultFiles = async (category: Category) => {
  const categoryDir = `${VAULT_DIR}${category}/`;
  try {
    const info = await FileSystem.getInfoAsync(categoryDir);
    if (!info.exists) {
      return [];
    }
    const files = await FileSystem.readDirectoryAsync(categoryDir);
    return files.map(file => `${categoryDir}${file}`);
  } catch (error) {
    console.error(`Error reading vault files for ${category}:`, error);
    return [];
  }
};

export const getAllVaultFiles = async () => {
  let allFiles: string[] = [];
  for (const category of categories) {
    const files = await getVaultFiles(category);
    allFiles = [...allFiles, ...files];
  }
  return allFiles;
};

export const deleteFromVault = async (fileUri: string) => {
  await FileSystem.deleteAsync(fileUri, { idempotent: true });
};
