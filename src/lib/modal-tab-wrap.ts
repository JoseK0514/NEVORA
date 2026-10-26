/**
 * Keyboard focus in an open modal dialog (every sheet, confirmation and finder): Tab past the last control returns to
 * the first, and Shift+Tab before the first goes to the last. A native modal otherwise lets Tab leave for the
 * browser's own controls; that blurs the window, the private pages pause and clear, and the dialog the keyboard user
 * was in disappears. Presentation only: no dialog opens, closes or submits differently.
 *
 * The function must stay self-contained: MODAL_TAB_SCRIPT runs its source before first paint.
 */
export function installModalTabWrap(doc: Document) {
  const focusable = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
  doc.addEventListener('keydown', event => {
    if (event.key !== 'Tab' || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const open = Array.prototype.filter.call(doc.querySelectorAll('dialog[open]'), (node: Element) => { try { return node.matches(':modal'); } catch { return false; } }) as HTMLElement[];
    const dialog = open[open.length - 1];
    if (!dialog) return;
    const items = Array.prototype.filter.call(dialog.querySelectorAll(focusable), (node: HTMLElement) => node.getClientRects().length > 0 && !node.closest('[inert]')) as HTMLElement[];
    if (!items.length) { event.preventDefault(); return; }
    const first = items[0], last = items[items.length - 1], active = doc.activeElement;
    if (event.shiftKey && (active === first || active === dialog || !dialog.contains(active))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (active === last || !dialog.contains(active))) { event.preventDefault(); first.focus(); }
  }, true);
}

export const MODAL_TAB_SCRIPT = `(${installModalTabWrap.toString()})(document);`;
