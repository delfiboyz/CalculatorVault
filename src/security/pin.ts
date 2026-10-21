import { getRandomBytes } from 'expo-crypto';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { KEYS, deleteSecret, getJSON, getSecret, setJSON } from './secureStore';
import { bytesToHex, constantTimeEqual, hexToBytes } from './encoding';

export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 8;

const PBKDF2_ITERATIONS = 30_000;

// Failures allowed before the lockout kicks in, then the wait doubles each time.
const FREE_ATTEMPTS = 5;
const BASE_LOCKOUT_MS = 30_000;
const MAX_LOCKOUT_MS = 60 * 60_000;
const INTRUDER_LOG_LIMIT = 50;

interface PinRecord {
  v: 1;
  algo: 'pbkdf2-sha256';
  iterations: number;
  salt: string;
  hash: string;
}

interface AttemptState {
  count: number;
  lockedUntil: number;
}

export interface IntruderEntry {
  at: number;
  lockedOut: boolean;
}

export type VerifyResult = { ok: true } | { ok: false; lockedUntil: number };

export const isValidPinFormat = (pin: string) =>
  new RegExp(`^\\d{${PIN_MIN_LENGTH},${PIN_MAX_LENGTH}}$`).test(pin);

const derive = async (pin: string, salt: Uint8Array, iterations: number) =>
  pbkdf2Async(sha256, pin, salt, { c: iterations, dkLen: 32 });

export const hasPin = async () =>
  !!(await getSecret(KEYS.pinRecord)) || !!(await getSecret(KEYS.legacyPin));

export const setPin = async (pin: string) => {
  if (!isValidPinFormat(pin)) {
    throw new Error('Invalid PIN format');
  }
  const salt = getRandomBytes(16);
  const hash = await derive(pin, salt, PBKDF2_ITERATIONS);
  const record: PinRecord = {
    v: 1,
    algo: 'pbkdf2-sha256',
    iterations: PBKDF2_ITERATIONS,
    salt: bytesToHex(salt),
    hash: bytesToHex(hash),
  };
  await setJSON(KEYS.pinRecord, record);
  await deleteSecret(KEYS.legacyPin);
};

const matchesStoredPin = async (pin: string) => {
  const record = await getJSON<PinRecord | null>(KEYS.pinRecord, null);
  if (record) {
    const hash = await derive(pin, hexToBytes(record.salt), record.iterations);
    return constantTimeEqual(hash, hexToBytes(record.hash));
  }

  const legacy = await getSecret(KEYS.legacyPin);
  if (legacy && legacy === pin) {
    await setPin(pin);
    return true;
  }
  return false;
};

const getAttempts = () => getJSON<AttemptState>(KEYS.attempts, { count: 0, lockedUntil: 0 });

export const getLockedUntil = async () => {
  const { lockedUntil } = await getAttempts();
  return lockedUntil > Date.now() ? lockedUntil : 0;
};

export const resetFailedAttempts = () => setJSON(KEYS.attempts, { count: 0, lockedUntil: 0 });

const logIntruder = async (lockedOut: boolean) => {
  const log = await getIntruderLog();
  log.unshift({ at: Date.now(), lockedOut });
  await setJSON(KEYS.intruderLog, log.slice(0, INTRUDER_LOG_LIMIT));
};

export const getIntruderLog = async () => {
  const log = await getJSON<IntruderEntry[]>(KEYS.intruderLog, []);
  return Array.isArray(log) ? log : [];
};

export const clearIntruderLog = () => deleteSecret(KEYS.intruderLog);

export const verifyPin = async (pin: string): Promise<VerifyResult> => {
  const attempts = await getAttempts();
  if (attempts.lockedUntil > Date.now()) {
    // Do not even evaluate the PIN while locked out, so guessing gains nothing.
    await logIntruder(true);
    return { ok: false, lockedUntil: attempts.lockedUntil };
  }

  if (isValidPinFormat(pin) && (await matchesStoredPin(pin))) {
    await resetFailedAttempts();
    return { ok: true };
  }

  const count = attempts.count + 1;
  const over = count - FREE_ATTEMPTS;
  const lockedUntil =
    over >= 0 ? Date.now() + Math.min(BASE_LOCKOUT_MS * 2 ** over, MAX_LOCKOUT_MS) : 0;
  await setJSON(KEYS.attempts, { count, lockedUntil });
  await logIntruder(false);
  return { ok: false, lockedUntil };
};
