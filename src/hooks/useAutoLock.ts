import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { isExternalActivityActive } from '../security/externalActivity';

// Locks when the app goes to the background, and after `timeoutSeconds`
// without a touch (0 disables the timer). Returns a handler to call on user activity.
export const useAutoLock = (active: boolean, timeoutSeconds: number, onLock: () => void) => {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onLockRef = useRef(onLock);
  onLockRef.current = onLock;

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const schedule = useCallback(() => {
    clear();
    if (!active || timeoutSeconds <= 0) return;
    timer.current = setTimeout(function tick() {
      if (isExternalActivityActive()) {
        timer.current = setTimeout(tick, timeoutSeconds * 1000);
        return;
      }
      onLockRef.current();
    }, timeoutSeconds * 1000);
  }, [active, timeoutSeconds]);

  useEffect(() => {
    schedule();
    return clear;
  }, [schedule]);

  useEffect(() => {
    if (!active) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' && !isExternalActivityActive()) {
        onLockRef.current();
      }
    });
    return () => subscription.remove();
  }, [active]);

  return schedule;
};
