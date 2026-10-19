"use client";

import { useEffect } from "react";

/** Moves keyboard focus to a section the link was meant to open, after in-app navigation too (IS-39). */
export function FocusOnArrival({ targetId }: { targetId: string }) {
  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    const focusable = target.querySelector<HTMLElement>("summary") ?? target;
    focusable.focus({ preventScroll: true });
    target.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [targetId]);
  return null;
}
