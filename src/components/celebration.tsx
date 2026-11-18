"use client";

import { useEffect, useRef } from "react";
import { claimCelebration, type CelebrationKind } from "@/lib/celebrations";

/** How long the ring is in the page: a little longer than its one run (--b-dur-enter, 300ms). */
const RING_MS = 400;

/** The one extra a celebrated moment gets (Phase 7): a single ring that leaves the success mark once. It is the same
 * mark as every other confirmed result (the kit's `BDoneMark`), not a second visual language. Render it only in the
 * branch that shows the confirmed result, inside the mark where the result has one (`BState kind="done"` takes it as
 * `extra`); the gate in lib/celebrations decides whether it plays (once per session, never for money, payroll actions,
 * the Clocker, errors or loading). The surrounding text carries the meaning, so this is hidden from assistive tech and
 * absent under reduced motion. Rules: b-moments.css. */
export function Celebration({ kind, eventKey, confirmed }: { kind: CelebrationKind; eventKey: string; confirmed: boolean }) {
  const burst = useRef<HTMLSpanElement>(null);
  // Decide once per occurrence; effects may re-run (Strict Mode) without re-claiming.
  const decided = useRef<{ key: string; celebrate: boolean } | null>(null);
  useEffect(() => {
    const element = burst.current;
    if (!confirmed || !element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // A page may hold a result twice (the phone screen and the wide layout); only the copy on screen may claim the moment.
    if (!element.parentElement?.getClientRects().length) return;
    const occurrence = `${kind}:${eventKey}`;
    if (decided.current?.key !== occurrence) decided.current = { key: occurrence, celebrate: claimCelebration({ kind, key: eventKey, serverConfirmed: confirmed, area: "portal" }).celebrate };
    if (!decided.current.celebrate) return;
    element.dataset.playing = "true";
    const timer = window.setTimeout(() => { delete element.dataset.playing; }, RING_MS);
    return () => { window.clearTimeout(timer); delete element.dataset.playing; };
  }, [kind, eventKey, confirmed]);
  return <span ref={burst} className="nevora-celebration" data-celebration={kind} aria-hidden="true"><i /></span>;
}
