'use client';

import {useEffect, useReducer} from 'react';

/* Phase 7 (Nov 17, 2026): one exit for every sheet, dialog and toast. The styles are in src/app/app/b-motion.css; this
 * module holds the only timing a component needs. An exit never delays the person: where the engine can keep a closed
 * dialog painted (the `overlay` property), the dialog closes at once, so focus is back on its opener and the page is
 * live while the sheet leaves. Elsewhere it stays open for the one exit and then closes. Reduced motion: no exit. */

/** `--b-dur-exit` in src/app/b-tokens.css (overlay-exit.test.ts keeps the two equal). */
export const OVERLAY_EXIT_MS = 150;

/** The length of an exit on this device: 0 under reduced motion or without a window. */
export function overlayExitMs(): number {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 0;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : OVERLAY_EXIT_MS;
}

/** The engine keeps a closed dialog in the top layer for its exit transition (Chromium). */
function paintsClosedDialogs(): boolean {
  return typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('overlay', 'auto');
}

const timers = new WeakMap<Element, ReturnType<typeof setTimeout>>();

/** Forget an exit in progress (the overlay is opening again). */
export function cancelOverlayExit(node: Element) {
  const timer = timers.get(node);
  if (timer !== undefined) { clearTimeout(timer); timers.delete(node); }
  node.removeAttribute('data-closing');
}

/** Close a dialog with the shared exit. `data-closing` marks it while it leaves (b-motion.css draws the exit from it).
 * Returns true when the dialog is already closed on return, so focus is already back on its opener. */
export function closeDialogWithExit(node: HTMLDialogElement, hold = false): boolean {
  cancelOverlayExit(node);
  const ms = overlayExitMs();
  if (!ms) { if (node.open) node.close(); return true; }
  node.setAttribute('data-closing', '');
  // `hold` keeps the dialog open for the exit on every engine (a panel that is not modal: nothing waits behind it).
  const now = !hold && paintsClosedDialogs();
  if (now && node.open) node.close();
  timers.set(node, setTimeout(() => {
    timers.delete(node);
    node.removeAttribute('data-closing');
    if (node.open) node.close();
  }, ms));
  return now;
}

type Hold<T> = {present: boolean; holding: boolean; kept: T};
function hold<T>(_: Hold<T>, next: Hold<T>): Hold<T> { return next; }

/** `value` while `present`; then the last value it had, for one exit (`leaving` is true meanwhile); then null. A leaving
 * overlay keeps what it showed: a sheet its content, a pill its words. The change is read during render, so the first
 * render without the value already holds the old one. */
export function useExitValue<T>(present: boolean, value: T): {value: T | null; leaving: boolean} {
  const [state, set] = useReducer(hold<T>, {present, holding: false, kept: value});
  // Remember the newest value while present; start the hold in the render that loses it.
  if (present && (!state.present || state.holding || !Object.is(state.kept, value))) set({present: true, holding: false, kept: value});
  else if (!present && state.present) set({present: false, holding: overlayExitMs() > 0, kept: state.kept});
  const holding = !present && state.holding;
  useEffect(() => {
    if (!holding) return;
    const timer = setTimeout(() => set({present: false, holding: false, kept: state.kept}), OVERLAY_EXIT_MS);
    return () => clearTimeout(timer);
    // The kept value cannot change while the hold runs (nothing is present to replace it).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holding]);
  return present ? {value, leaving: false} : holding ? {value: state.kept, leaving: true} : {value: null, leaving: false};
}

/** True while `open`, and for one exit after it turns false: an overlay stays mounted while it leaves. */
export function useExitHold(open: boolean): boolean {
  const {leaving} = useExitValue(open, true);
  return open || leaving;
}
