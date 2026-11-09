"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { claimCelebration, type CelebrationKind } from "@/lib/celebrations";

/** Twelve particles on fixed angles: the same burst every time, nothing random. */
const PARTICLES = Array.from({ length: 12 }, (_, index) => {
  const angle = (index / 12) * Math.PI * 2, distance = 34 + (index % 3) * 10;
  return { x: Math.round(Math.cos(angle) * distance), y: Math.round(Math.sin(angle) * distance), tone: index % 4 };
});

/** A brief, decorative burst for a server-confirmed moment. Render it only in
 * the branch that shows the confirmed result; the gate in lib/celebrations
 * decides whether it plays (once per session, never for money, payroll
 * actions, the Clocker, errors or loading). The surrounding text carries the
 * meaning, so this is hidden from assistive tech and absent under reduced motion. */
export function Celebration({ kind, eventKey, confirmed }: { kind: CelebrationKind; eventKey: string; confirmed: boolean }) {
  const burst = useRef<HTMLSpanElement>(null);
  // Decide once per occurrence; effects may re-run (Strict Mode) without re-claiming.
  const decided = useRef<{ key: string; celebrate: boolean } | null>(null);
  useEffect(() => {
    const element = burst.current;
    if (!confirmed || !element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const occurrence = `${kind}:${eventKey}`;
    if (decided.current?.key !== occurrence) decided.current = { key: occurrence, celebrate: claimCelebration({ kind, key: eventKey, serverConfirmed: confirmed, area: "portal" }).celebrate };
    if (!decided.current.celebrate) return;
    element.dataset.playing = "true";
    const timer = window.setTimeout(() => { delete element.dataset.playing; }, 700);
    return () => { window.clearTimeout(timer); delete element.dataset.playing; };
  }, [kind, eventKey, confirmed]);
  return <span ref={burst} className="nevora-celebration" data-celebration={kind} aria-hidden="true">
    {PARTICLES.map((particle, index) => <i key={index} data-tone={particle.tone}
      style={{ "--x": `${particle.x}px`, "--y": `${particle.y}px` } as CSSProperties} />)}
  </span>;
}
