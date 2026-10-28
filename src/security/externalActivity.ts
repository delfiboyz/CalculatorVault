// Pickers, share sheets, "open with" and biometric prompts push the app to the
// background on Android (and to "inactive" on iOS). Auto-lock must not fire for
// those, so callers wrap them here and the lock logic checks isExternalActivityActive().
let depth = 0;
let lastEndedAt = 0;

// AppState events can arrive just after the external screen closes.
const GRACE_MS = 1000;

export const withExternalActivity = async <T>(fn: () => Promise<T>): Promise<T> => {
  depth++;
  try {
    return await fn();
  } finally {
    depth--;
    lastEndedAt = Date.now();
  }
};

export const isExternalActivityActive = () => depth > 0 || Date.now() - lastEndedAt < GRACE_MS;
