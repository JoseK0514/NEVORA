"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { BDoneMark } from "./b-kit";

/* Phase 7 (moments): a done state that stays on the page (a confirmed week) is drawn from the server's read, so it is
 * there on every visit. Its mark should settle only when the result arrived while the person watched. The control that
 * received the server's confirmation notes the arrival; the mark that mounts after the fresh read takes it once. */
const arrivals = new Set<string>();
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const tell = () => { for (const listener of listeners) listener(); };

/** Call only after the server confirmed the action; `key` names the one occurrence ("week:2026-11-16"). */
export function noteArrival(key: string) { arrivals.add(key); tell(); }

/** The done mark of a lasting state. With an arrival noted for `occurrence` it settles once and, when focus was lost
 * with the control that sent the action, moves focus to `focusId` (the result's title). Otherwise it is still. */
export function BDoneArrival({ occurrence, focusId, children }: { occurrence: string; focusId?: string; children?: ReactNode }) {
  const fresh = useSyncExternalStore(subscribe, () => arrivals.has(occurrence), () => false);
  useEffect(() => {
    if (!fresh) return;
    const active = document.activeElement;
    if (focusId && (!active || active === document.body)) {
      const title = [...document.querySelectorAll<HTMLElement>(`[data-b-arrival="${focusId}"]`)].find(element => element.getClientRects().length > 0);
      title?.focus({ preventScroll: true });
    }
    // Longer than the mark's one run; after it a later visit finds the state still.
    const timer = window.setTimeout(() => { arrivals.delete(occurrence); tell(); }, 1000);
    return () => window.clearTimeout(timer);
  }, [fresh, focusId, occurrence]);
  return <BDoneMark still={!fresh}>{children}</BDoneMark>;
}
