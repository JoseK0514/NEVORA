'use client';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

/** The shortest time a retry shows as busy, so a fast answer doesn't flash the busy label. */
export const RETRY_MIN_MS = 600;

/** Try again on an error screen (Jose, Nov 26, 2026: the button had no real loading state). The retry runs inside a
 * transition, so `busy` lasts while Next reads the page again (router.refresh or the boundary's retry), and at least
 * RETRY_MIN_MS. A second press while busy does nothing. If the page comes back, the screen unmounts; if it fails again,
 * the button returns to Try again. */
export function useRetry(run: () => void) {
  const [pending, start] = useTransition();
  const [held, setHeld] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const busy = pending || held;
  const retry = useCallback(() => {
    if (busy) return;
    setHeld(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setHeld(false), RETRY_MIN_MS);
    start(() => { run(); });
  }, [busy, run]);
  return { busy, retry };
}
