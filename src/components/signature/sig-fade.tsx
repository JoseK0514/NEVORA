"use client";

import { useState, type ReactNode } from "react";

/** Cross-fades its content when `value` changes (a running duration ticking over, a band figure updating), never on
 * the first render, so a page doesn't flicker on load. The fade is opacity only (components.css, `data-sig-fade`),
 * so it also runs under reduced motion. Visual only: pair it with a text alternative, as Duration does. */
export function SigFade({ value, className, children }: { value: string; className?: string; children: ReactNode }) {
  const [shown, setShown] = useState(value);
  const [changed, setChanged] = useState(false);
  if (shown !== value) { setShown(value); setChanged(true); }
  return <span key={value} className={className} aria-hidden="true" data-sig-fade={changed ? "" : undefined}>{children}</span>;
}
