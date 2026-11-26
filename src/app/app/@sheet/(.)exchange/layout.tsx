import type { ReactNode } from "react";
import { RouteSheet } from "@/components/quiet/quiet-sheet";
import { readPageLang } from "@/lib/i18n/page-lang.server";
import { ROUTE_PAGES_COPY } from "../../route-pages-copy";

/** v5 (approved Oct 24, 2026; mockups E04, E05): Swap, Offer for cover and Unable to work, opened from a shift, rise as
 * one sheet over the page. The sheet stays put while its content loads; closing goes back. */
export default async function ShiftChangeSheet({ children }: { children: ReactNode }) {
  return <RouteSheet label={ROUTE_PAGES_COPY[await readPageLang()].shiftSheet} match="^/app/exchange/(?:swap|callout)$" restoreShiftFocus>{children}</RouteSheet>;
}
