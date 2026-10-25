import type { ReactNode } from "react";
import { RouteSheet } from "@/components/quiet/quiet-sheet";

/** v5 (approved Oct 24, 2026; mockups E04, E05): Swap, Offer for cover and Unable to work, opened from a shift, rise as
 * one sheet over the page. The sheet stays put while its content loads; closing goes back. */
export default function ShiftChangeSheet({ children }: { children: ReactNode }) {
  return <RouteSheet label="Change a shift">{children}</RouteSheet>;
}
