/** Safe popover checks. Engines without the :popover-open selector or the popover methods (Safari 16; review 37/50)
 * made matches() throw a SyntaxError, which crashed the shell's document-level handlers and sent every role to the
 * error page. Here they degrade: the check falls back to "has layout boxes", and the calls become no-ops. */
export function isPopoverOpen(element: Element | null | undefined): element is HTMLElement {
  if (!element) return false;
  try { return element.matches(":popover-open"); }
  catch { return element.getClientRects().length > 0; }
}

export function showPopover(element: Element | null | undefined) {
  if (!(element instanceof HTMLElement) || typeof element.showPopover !== "function") return;
  const open: boolean = isPopoverOpen(element);
  if (!open) element.showPopover();
}

export function hidePopover(element: Element | null | undefined) {
  if (!(element instanceof HTMLElement) || typeof element.hidePopover !== "function") return;
  const open: boolean = isPopoverOpen(element);
  if (open) element.hidePopover();
}
