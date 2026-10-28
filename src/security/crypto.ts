import {
  AESEncryptionKey,
  AESKeySize,
  AESSealedData,
  aesDecryptAsync,
  aesEncryptAsync,
} from 'expo-crypto';
import { File, FileMode } from 'expo-file-system';
import { KEYS, getSecret, setSecret } from './secureStore';
import { asciiToBytes } from './encoding';

// Files are encrypted with AES-256-GCM in independent chunks so that large
// videos never have to be held in memory at once. Layout:
//   "CVE1" | chunkSize (u32 BE) | chunk records (iv 12 B | ciphertext | tag 16 B)...
// Each chunk is authenticated together with the file id, its index and whether
// it is the last one, so chunks cannot be reordered, swapped between files or truncated.
const MAGIC = 'CVE1';
const HEADER_SIZE = 8;
const CHUNK_SIZE = 1024 * 1024;
const IV_SIZE = 12;
const TAG_SIZE = 16;

let cachedKey: AESEncryptionKey | null = null;

const getMasterKey = async () => {
  if (cachedKey) return cachedKey;
  const stored = await getSecret(KEYS.masterKey);
  if (stored) {
    cachedKey = await AESEncryptionKey.import(stored, 'hex');
  } else {
    cachedKey = await AESEncryptionKey.generate(AESKeySize.AES256);
    await setSecret(KEYS.masterKey, await cachedKey.encoded('hex'));
  }
  return cachedKey;
};

// Drop the in-memory key when the vault locks; it is re-read from secure storage on unlock.
export const forgetMasterKey = () => {
  cachedKey = null;
};

const chunkAad = (fileId: string, index: number, last: boolean) =>
  asciiToBytes(`${fileId}|${index}|${last ? 1 : 0}`);

export const encryptBytes = async (plain: Uint8Array, aad: string) => {
  const sealed = await aesEncryptAsync(plain, await getMasterKey(), {
    additionalData: asciiToBytes(aad),
  });
  return sealed.combined('bytes');
};

export const decryptBytes = async (combined: Uint8Array, aad: string) =>
  aesDecryptAsync(AESSealedData.fromCombined(combined), await getMasterKey(), {
    output: 'bytes',
    additionalData: asciiToBytes(aad),
  });

export const encryptFile = async (source: File, dest: File, fileId: string) => {
  const key = await getMasterKey();
  const size = source.size;
  const header = new Uint8Array(HEADER_SIZE);
  header.set(asciiToBytes(MAGIC));
  new DataView(header.buffer).setUint32(4, CHUNK_SIZE);

  dest.create({ overwrite: true, intermediates: true });
  const input = source.open(FileMode.ReadOnly);
  const output = dest.open(FileMode.Truncate);
  try {
    output.writeBytes(header);
    let read = 0;
    let index = 0;
    do {
      const chunk = input.readBytes(Math.min(CHUNK_SIZE, size - read));
      if (chunk.length === 0 && read < size) throw new Error('Unexpected end of file');
      read += chunk.length;
      const sealed = await aesEncryptAsync(chunk, key, {
        additionalData: chunkAad(fileId, index++, read >= size),
      });
      output.writeBytes(await sealed.combined('bytes'));
    } while (read < size);
  } catch (error) {
    output.close();
    dest.delete();
    throw error;
  } finally {
    input.close();
  }
  output.close();
};

export const decryptFile = async (source: File, dest: File, fileId: string) => {
  const key = await getMasterKey();
  const total = source.size - HEADER_SIZE;
  const input = source.open(FileMode.ReadOnly);
  dest.create({ overwrite: true, intermediates: true });
  const output = dest.open(FileMode.Truncate);
  try {
    const header = input.readBytes(HEADER_SIZE);
    const magic = String.fromCharCode(...header.subarray(0, 4));
    if (magic !== MAGIC || total < IV_SIZE + TAG_SIZE) throw new Error('Not a vault file');
    const chunkSize = new DataView(header.buffer, header.byteOffset, HEADER_SIZE).getUint32(4);
    const recordSize = chunkSize + IV_SIZE + TAG_SIZE;

    let read = 0;
    let index = 0;
    while (read < total) {
      const record = input.readBytes(Math.min(recordSize, total - read));
      if (record.length === 0) throw new Error('Unexpected end of file');
      read += record.length;
      const plain = await aesDecryptAsync(AESSealedData.fromCombined(record), key, {
        output: 'bytes',
        additionalData: chunkAad(fileId, index++, read >= total),
      });
      output.writeBytes(plain);
    }
  } catch (error) {
    output.close();
    dest.delete();
    throw error;
  } finally {
    input.close();
  }
  output.close();
};
