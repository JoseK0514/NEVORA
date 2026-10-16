"use client";

import { PrinterIcon } from "@phosphor-icons/react/dist/ssr/Printer";

/** Prints the weekly grid; the print stylesheet hides navigation and controls. */
export function PrintScheduleButton() {
  return <button type="button" className="nevora-action-menu-item mws-print-action" onClick={event => {
    event.currentTarget.closest<HTMLElement>("[popover]")?.hidePopover();
    window.print();
  }}>
    <strong><PrinterIcon size={16} aria-hidden="true" /> Print schedule</strong><span>A one-page week for the break room.</span>
  </button>;
}
