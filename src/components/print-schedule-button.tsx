"use client";

import { usePortalLang } from "@/lib/i18n/portal-lang";
import { SMALL_PARTS_COPY } from "./small-parts-copy";

/** Prints the weekly grid; the print stylesheet hides navigation and controls. Owner premium (copy critique): a plain row
 * like the rest of Schedule options (no icon; Nov 1 upscale: one line, no detail). */
export function PrintScheduleButton() {
  const label = SMALL_PARTS_COPY[usePortalLang()].print;
  return <button type="button" className="nevora-action-menu-item mws-print-action" onClick={event => {
    event.currentTarget.closest<HTMLElement>("[popover]")?.hidePopover();
    window.print();
  }}>
    <strong>{label}</strong>
  </button>;
}
