"use client";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTopBarSlot } from "./top-bar-slot";

/** Clean Manager (v3): a server page's tools move into the desktop top bar at 1180px and wider (as the mockups place them);
 * narrower, they stay where the page put them. The page's CSS hides its own copy at that width, so nothing moves. */
export function TopBarTools({ className, children }: { className: string; children: ReactNode }) {
  const slot = useTopBarSlot(true, className);
  return slot ? createPortal(children, slot) : <>{children}</>;
}
