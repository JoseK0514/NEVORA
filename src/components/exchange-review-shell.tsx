"use client";

import type { ReactNode } from "react";
import "./exchange-review.css";

/* Phase 1 (inspection Oct 24): page entrances are off. Content painted, jumped back and animated in on every visit,
 * which read as lag; a page now appears in place. */
export function ExchangeReviewShell({ children, className }: { children: ReactNode; className: string; view: string }) {
  return <div className={`${className} exchange-review`}>{children}</div>;
}
