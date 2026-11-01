"use client";

/** Prints the weekly grid; the print stylesheet hides navigation and controls. Owner premium (copy critique): a plain row
 * like the rest of Schedule options (no icon). */
export function PrintScheduleButton() {
  return <button type="button" className="nevora-action-menu-item mws-print-action" onClick={event => {
    event.currentTarget.closest<HTMLElement>("[popover]")?.hidePopover();
    window.print();
  }}>
    <strong>Print schedule</strong><span>One page for the break room</span>
  </button>;
}
