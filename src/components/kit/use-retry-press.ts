'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RETRY_MIN_MS } from './use-retry';

/** An in-card "Try again" (English flag A6, Jose, Nov 26, 2026: Try again needs a real loading state). Pressing it runs
 * the card's own retry and shows the button as busy until that retry settles (when it returns a promise) and for at
 * least RETRY_MIN_MS, so a fast answer doesn't flash. A press while busy does nothing. Each card keeps its own busy
 * state: unlike the full-page error screens (useRetry), a card isn't replaced by a new screen when its retry fails. */
export function useRetryPress(run: (() => unknown) | undefined) {
  const [busy, setBusy] = useState(false);
  const held = useRef(false), alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const press = useCallback(() => {
    if (held.current || !run) return;
    held.current = true;
    setBusy(true);
    const started = Date.now();
    const release = () => {
      const wait = Math.max(0, RETRY_MIN_MS - (Date.now() - started));
      setTimeout(() => { held.current = false; if (alive.current) setBusy(false); }, wait);
    };
    let result: unknown;
    try { result = run(); } catch { release(); return; }
    if (result && typeof (result as Promise<unknown>).then === 'function') (result as Promise<unknown>).then(release, release);
    else release();
  }, [run]);
  return { busy, press };
}
