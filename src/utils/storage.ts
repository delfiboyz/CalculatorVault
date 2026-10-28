import { randomUUID } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { decryptBytes, decryptFile, encryptBytes, encryptFile, forgetMasterKey } from '../security/crypto';
import { KEYS, deleteSecret } from '../security/secureStore';
import { bytesToJson, jsonToBytes } from '../security/encoding';

export const categories = ['Photos', 'Videos', 'Documents'] as const;
export type Category = (typeof categories)[number];

export interface VaultItem {
  id: string;
  category: Category;
  name: string;
  mimeType: string;
  size: number;
  addedAt: number;
}

// Everything on disk is ciphertext: file contents live under random ids in data/,
// and names, types and categories only exist inside the encrypted index.
const VAULT_DIR = new Directory(Paths.document, 'vault');
const DATA_DIR = new Directory(VAULT_DIR, 'data');
const INDEX_AAD = 'vault-index';
// Decrypted copies for viewing/sharing; wiped whenever the vault locks.
const TEMP_DIR = new Directory(Paths.cache, 'vault-view');

const indexFile = () => new File(VAULT_DIR, 'index.enc');
const dataFile = (id: string) => new File(DATA_DIR, `${id}.enc`);

let index: VaultItem[] | null = null;

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  heic: 'image/heic',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
  pdf: 'application/pdf',
  txt: 'text/plain',
};

const guessMimeType = (name: string) =>
  MIME_BY_EXT[name.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream';

// Keep only characters that are safe in a file name, so a crafted name cannot
// escape the temp directory when the file is decrypted for viewing.
const sanitizeName = (name: string) => {
  const clean = name
    .replace(/[\/\\:*?"<>|\u0000-\u001f]/g, '_')
    .replace(/^\.+/, '')
    .slice(-100);
  return clean || 'file';
};

const ensureDir = (dir: Directory) => {
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
};

export const wipeTempFiles = () => {
  if (TEMP_DIR.exists) TEMP_DIR.delete();
};

export const initializeVault = () => {
  ensureDir(VAULT_DIR);
  ensureDir(DATA_DIR);
  // Plain-text leftovers from a previous session (e.g. after a crash) must not survive.
  wipeTempFiles();
};

const saveIndex = async (items: VaultItem[]) => {
  const tmp = new File(VAULT_DIR, 'index.enc.tmp');
  tmp.create({ overwrite: true });
  tmp.write(await encryptBytes(jsonToBytes(items), INDEX_AAD));
  tmp.move(indexFile(), { overwrite: true });
  index = items;
};

const loadIndex = async () => {
  if (index) return index;
  const file = indexFile();
  index = file.exists ? bytesToJson<VaultItem[]>(await decryptBytes(await file.bytes(), INDEX_AAD)) : [];
  return index;
};

const importFile = async (
  source: File,
  category: Category,
  name: string,
  mimeType: string | null | undefined,
) => {
  const id = randomUUID();
  await encryptFile(source, dataFile(id), id);
  const item: VaultItem = {
    id,
    category,
    name: sanitizeName(name),
    mimeType: mimeType || guessMimeType(name),
    size: source.size,
    addedAt: Date.now(),
  };
  await saveIndex([...(await loadIndex()), item]);
  return item;
};

// Version 1 stored files unencrypted in vault/<Category>/. Encrypt them and remove the originals.
const migrateLegacyFiles = async () => {
  for (const category of categories) {
    const legacyDir = new Directory(VAULT_DIR, category);
    if (!legacyDir.exists) continue;
    for (const entry of legacyDir.list()) {
      if (entry instanceof File) {
        await importFile(entry, category, entry.name, null);
        entry.delete();
      }
    }
    legacyDir.delete();
  }
};

// Call once after a successful unlock.
export const openVault = async () => {
  initializeVault();
  await loadIndex();
  await migrateLegacyFiles();
};

export const lockVault = () => {
  wipeTempFiles();
  index = null;
  forgetMasterKey();
};

export interface AddSource {
  uri: string;
  name?: string | null;
  mimeType?: string | null;
}

export const addToVault = async ({ uri, name, mimeType }: AddSource, category: Category) => {
  const source = new File(uri);
  const item = await importFile(source, category, name || source.name, mimeType);
  // Pickers hand us a plain-text copy in the cache; don't leave it lying around.
  if (source.uri.startsWith(Paths.cache.uri) && source.exists) {
    source.delete();
  }
  return item;
};

export const getVaultItems = async (category: Category) =>
  (await loadIndex()).filter((item) => item.category === category);

export const getAllVaultItems = () => loadIndex();

const pendingDecrypts = new Map<string, Promise<string>>();

// Returns a decrypted temporary copy for previewing, sharing or exporting.
export const getDecryptedUri = (item: VaultItem) => {
  const target = new File(TEMP_DIR, item.id, item.name);
  if (target.exists) return Promise.resolve(target.uri);

  // A thumbnail and the preview may ask for the same file at once.
  let pending = pendingDecrypts.get(item.id);
  if (!pending) {
    pending = decryptFile(dataFile(item.id), target, item.id)
      .then(() => target.uri)
      .finally(() => pendingDecrypts.delete(item.id));
    pendingDecrypts.set(item.id, pending);
  }
  return pending;
};

export const deleteFromVault = async (item: VaultItem) => {
  const file = dataFile(item.id);
  if (file.exists) file.delete();
  const tempDir = new Directory(TEMP_DIR, item.id);
  if (tempDir.exists) tempDir.delete();
  await saveIndex((await loadIndex()).filter((i) => i.id !== item.id));
};

// Irreversibly destroys every vault file and the encryption key.
export const eraseVault = async () => {
  wipeTempFiles();
  if (VAULT_DIR.exists) VAULT_DIR.delete();
  index = null;
  forgetMasterKey();
  await deleteSecret(KEYS.masterKey);
  initializeVault();
};
