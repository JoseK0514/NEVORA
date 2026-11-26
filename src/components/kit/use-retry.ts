'use client';
import { useCallback, useEffect, useSyncExternalStore, useTransition } from 'react';

/** The shortest time a retry shows as busy, so a fast answer doesn't flash the busy label. */
export const RETRY_MIN_MS = 600;

/* Nov 26, 2026 (QA R1): when a retry fails again at once, the error boundary mounts a new error screen, so a busy flag
 * held in component state was lost within 80 ms: no "Trying again…", and a second press started a second refresh. The
 * busy window lives here instead, outside any one screen, so the screen that replaces it reads the same state and the
 * second press is refused. */
let busyUntil = 0;
let expiry: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const emit = () => { for (const listener of listeners) listener(); };
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const heldNow = () => Date.now() < busyUntil;

/** Starts the shared busy window; false when one is already running (the press is refused). Exported for its test. */
export function claimRetryWindow(now = Date.now()): boolean {
  if (now < busyUntil) return false;
  busyUntil = now + RETRY_MIN_MS;
  clearTimeout(expiry);
  expiry = setTimeout(emit, RETRY_MIN_MS + 10);
  emit();
  return true;
}
/** Test seam: clears the shared window. */
export function resetRetryWindow() { busyUntil = 0; clearTimeout(expiry); emit(); }

/** Try again on an error screen (Jose, Nov 26, 2026: the button had no real loading state). The retry runs inside a
 * transition, so `busy` lasts while Next reads the page again (router.refresh or the boundary's retry), and at least
 * RETRY_MIN_MS across any remount of the screen. A press while busy does nothing. If the page comes back, the screen
 * unmounts; if it fails again, the button returns to Try again once the window ends. */
export function useRetry(run: () => void) {
  const [pending, start] = useTransition();
  const held = useSyncExternalStore(subscribe, heldNow, () => false);
  // A screen mounted inside a running window re-reads it when the window ends.
  useEffect(() => { if (!heldNow()) return; const id = setTimeout(emit, Math.max(0, busyUntil - Date.now()) + 10); return () => clearTimeout(id); }, [held]);
  const busy = pending || held;
  const retry = useCallback(() => {
    if (pending || !claimRetryWindow()) return;
    start(() => { run(); });
  }, [pending, run]);
  return { busy, retry };
}
