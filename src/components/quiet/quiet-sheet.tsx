'use client';

import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode} from 'react';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {usePortalLang} from '@/lib/i18n/portal-lang';
import {SMALL_PARTS_COPY} from '../small-parts-copy';
import {cancelOverlayExit, closeDialogWithExit, overlayExitMs, useExitHold, useExitValue} from '../kit/overlay-exit';

/* v5 "One look" bottom sheet (approved Oct 24, 2026; mockups E03–E05 and E08). A native modal dialog, so focus stays
 * inside, Escape closes and the page behind is inert. It rises over the page with a grabber; drag the top down or
 * tap outside to close. Wide screens get a centred card. Reduced motion: no travel.
 * Phase 7 (Nov 17, 2026): one enter and one exit for every sheet (b-motion.css, kit/overlay-exit.ts). Where the engine can
 * paint a closed dialog the sheet closes at once and leaves over 150ms, so focus is back on its opener and the page takes
 * a tap while it goes; its content is kept for that exit. Reduced motion: it opens and closes at once. */

const SheetClose = createContext<(() => void) | null>(null);

/** Inside a sheet, closes it; on a full page, null. */
/** The last input was a key press (Enter/Space) rather than a pointer: decides where an inspector panel puts focus. */
let lastKeyboard = false;
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') lastKeyboard = true; }, true);
  window.addEventListener('pointerdown', () => { lastKeyboard = false; }, true);
}

export function useSheetClose() {
  return useContext(SheetClose);
}

/** `modal={false}` (Owner Timecards on wide screens, Nov 1 upscale): the same panel opened as a non-modal inspector, so
 * the page behind stays live and unlocked: no scrim, focus stays where it was, Escape still closes it (and its onClose
 * returns focus), and a click outside doesn't close it. Every other sheet is modal, as before. */
/** `role` and `describedBy` (Nov 21, 2026): a question that interrupts ("Discard changes?") is an alertdialog named by its
 * title and described by its one line. */
export function QuietSheet({open, onClose, label, labelledBy, describedBy, role, children, modal = true}: {open: boolean; onClose: () => void; label?: string; labelledBy?: string; describedBy?: string; role?: 'alertdialog'; children: ReactNode; modal?: boolean}) {
  const dialog = useRef<HTMLDialogElement>(null);
  // The caller's onClose, when it waits for a sheet that stays open for its exit.
  const closing = useRef<number | undefined>(undefined);
  const drag = useRef<{y: number; t: number; dy: number} | null>(null);
  // The content the sheet showed, kept while it leaves (a caller often drops it in the same render that closes the sheet).
  const held = useExitValue(open, children);

  const close = useCallback(() => {
    const node = dialog.current;
    if (!node || !node.open || node.hasAttribute('data-closing')) return;
    // A dragged sheet leaves from where the finger let go: the inline offset goes in the same frame the exit starts.
    node.removeAttribute('data-sheet-dragging');
    node.style.transform = '';
    // Review F3 (NV-251): a right-hand inspector is not modal, so nothing waits behind it: it stays for its 150ms exit
    // and the page behind re-flows only after.
    const closed = closeDialogWithExit(node, node.hasAttribute('data-inspector'));
    if (closed) onClose();
    else { window.clearTimeout(closing.current); closing.current = window.setTimeout(onClose, overlayExitMs()); }
  }, [onClose]);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    // Opened again while it was leaving: the exit is forgotten.
    if (open) cancelOverlayExit(node);
    // Switching presentation while open requires closing the native dialog first.
    // Keep its children mounted so an in-progress entry survives text-size changes.
    if (open && node.open && modal === node.hasAttribute('data-inspector')) node.close();
    if (open && !node.open) {
      if (modal) { node.removeAttribute('data-inspector'); node.showModal(); node.focus({preventScroll: true}); document.documentElement.setAttribute('data-q-sheet', ''); }
      else {
        // show() runs the dialog focusing steps (Chromium and WebKit both move focus to the panel's first control). A
        // non-modal inspector leaves focus where it was, e.g. on the person's row, so give it back when show() took it.
        const before = document.activeElement;
        node.setAttribute('data-inspector', ''); node.show();
        // Review B1 (NV-224): opened from the keyboard (Enter on the row), focus moves to the panel's heading, so its
        // controls are next instead of after the whole table; a pointer open keeps focus on the row as before.
        const heading = lastKeyboard ? node.querySelector<HTMLElement>('h1, h2, h3') : null;
        if (heading) { if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1; heading.focus({preventScroll: true}); }
        else if (before instanceof HTMLElement && before !== document.body && before.isConnected && !node.contains(before) && document.activeElement !== before) before.focus({preventScroll: true});
      }
    }
    // The caller closed it (a save finished, the route changed): the same exit; a close already under way keeps its own.
    if (!open && node.open && !node.hasAttribute('data-closing')) closeDialogWithExit(node, node.hasAttribute('data-inspector'));
    return () => { if (!document.querySelector('dialog.q-sheet[open]:not([data-inspector])')) document.documentElement.removeAttribute('data-q-sheet'); };
  }, [open, modal]);

  // A non-modal panel gets no "cancel" event from Escape, so it listens for the key itself while it is open.
  useEffect(() => {
    if (modal || !open) return;
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented && !document.querySelector('dialog[open]:modal')) { event.preventDefault(); close(); } };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [modal, open, close]);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    // Escape: animate out like every other close.
    const cancel = (event: Event) => { event.preventDefault(); close(); };
    const closed = () => { if (!document.querySelector('dialog.q-sheet[open]:not([data-inspector])')) document.documentElement.removeAttribute('data-q-sheet'); };
    node.addEventListener('cancel', cancel);
    node.addEventListener('close', closed);
    return () => { node.removeEventListener('cancel', cancel); node.removeEventListener('close', closed); };
  }, [close]);

  return <dialog ref={dialog} className="q-page q-sheet" role={role} aria-label={label} aria-labelledby={labelledBy} aria-describedby={describedBy} tabIndex={-1}
    // A tap on the dim area outside the sheet (the dialog's own box, not its content) closes it.
    onClick={event => { if (modal && event.target === event.currentTarget) close(); }}
    onPointerDown={event => {
      const target = event.target as HTMLElement;
      if (!target.closest('.q-sheet__top') || target.closest('a, button, input, textarea, select, label')) return;
      drag.current = {y: event.clientY, t: performance.now(), dy: 0};
      // While it is dragged the sheet follows the finger 1:1 (b-motion.css turns its transition off).
      event.currentTarget.setAttribute('data-sheet-dragging', 'true');
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    }}
    onPointerMove={event => {
      if (!drag.current) return;
      const dy = Math.max(0, event.clientY - drag.current.y);
      drag.current.dy = dy;
      (event.currentTarget as HTMLElement).style.transform = `translateY(${dy}px)`;
    }}
    onPointerUp={event => {
      const state = drag.current;
      drag.current = null;
      if (!state) return;
      const node = event.currentTarget as HTMLElement;
      const velocity = state.dy / Math.max(1, performance.now() - state.t);
      // The transition comes back in the same frame the offset goes, so either way it moves on from the dragged position.
      node.removeAttribute('data-sheet-dragging');
      if (state.dy > 120 || velocity > 0.5) close();
      else node.style.transform = '';
    }}
    onPointerCancel={event => { drag.current = null; event.currentTarget.removeAttribute('data-sheet-dragging'); (event.currentTarget as HTMLElement).style.transform = ''; }}>
    <SheetClose.Provider value={close}>
      <div className="q-sheet__in">
        <div className="q-sheet__top"><div className="q-sheet__grab" aria-hidden="true"/></div>
        {held.leaving ? held.value : children}
      </div>
    </SheetClose.Provider>
  </dialog>;
}

/** A route opened as a sheet over the page it came from (an intercepted route): closing goes back. A parallel slot keeps
 * its last content when a soft navigation lands on a page it has no route for, so the sheet shows only while the address
 * is still one of its own (`match`). */
export function RouteSheet({label, match, children,restoreShiftFocus=false}: {label: string; /** A pattern string (props from a server layout must serialize). */ match: string; children: ReactNode;restoreShiftFocus?:boolean}) {
  const router = useRouter();
  const pathname = usePathname();
  // The sheet stays mounted for its exit after the address stops being its own (Phase 7).
  const matched = new RegExp(match).test(pathname), mounted = useExitHold(matched);
  if (!mounted) return null;
  return <QuietSheet open={matched} label={label} onClose={() => {
    const url=new URL(window.location.href),source=url.searchParams.get('sourceShiftId')??url.searchParams.get('shiftId');
    const restore=restoreShiftFocus&&document.getElementById('employee-mobile')?.dataset.employeeMobile==='true';
    router.back();
    // The prior action link was inside a shift dialog that closed on navigation.
    // Restore its visible schedule row instead of that now-hidden dialog link.
    if(restore&&source)window.requestAnimationFrame(()=>{
      const row=Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]')).find(link=>{
        const target=new URL(link.href);return target.origin===url.origin&&target.pathname==='/app/schedule'&&target.searchParams.get('shift')===source&&link.getClientRects().length>0;
      });
      row?.focus({preventScroll:true});
    });
  }}>{children}</QuietSheet>;
}

/** The sheet's left action: closes the sheet, or on a full page goes to `href`. */
export function SheetCancel({href, children: given, className = 'q-nav__l q-nav__l--teal'}: {href: string; children?: ReactNode; className?: string}) {
  const cancel = SMALL_PARTS_COPY[usePortalLang()].sheet.cancel, children = given ?? cancel;
  const close = useSheetClose();
  if (close) return <button type="button" className={className} onClick={close}>{children}</button>;
  return <Link className={className} href={href}>{children}</Link>;
}

/** A row that opens its details as a sheet (a request, a decided item). `anchor` (an element id) also opens it when the
 * page is reached with that #hash, so links that point at the item still land on it. */
export function SheetRow({ title, detail, value, sheetTitle, anchor, avatar, status, children }: { title: ReactNode; detail?: ReactNode; value?: ReactNode; sheetTitle: string; anchor?: string; avatar?: ReactNode; /** The item's state, kept on the row for its readers (data-employee-status). */ status?: string; children: ReactNode }) {
  const lang = usePortalLang();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!anchor) return;
    const check = () => { if (window.location.hash === `#${anchor}`) setOpen(true); };
    check();
    window.addEventListener('hashchange', check);
    return () => window.removeEventListener('hashchange', check);
  }, [anchor]);
  return <li id={anchor} tabIndex={anchor ? -1 : undefined} data-employee-status={status}>
    <button type="button" className={`q-row${detail ? '' : ' q-row--one'}${avatar ? ' q-row--av' : ''} q-row--btn`} aria-haspopup="dialog" onClick={() => setOpen(true)}>
      {avatar ? <span className="q-av" aria-hidden="true">{avatar}</span> : null}
      <span className="q-rt"><b>{title}</b>{detail ? <i>{detail}</i> : null}</span>
      {value ? <span className="q-rv">{value}</span> : null}
      <CaretRightIcon weight="bold" className="q-chev" aria-hidden="true" />
    </button>
    <QuietSheet open={open} label={sheetTitle} onClose={() => {
      setOpen(false);
      if (anchor && window.location.hash === `#${anchor}`) history.replaceState(history.state, '', window.location.pathname + window.location.search);
    }}>
      <div className="q-nav"><span /><span className="q-nav__t">{sheetTitle}</span><SheetCancel href="#" className="q-nav__r q-nav__r--b">{SMALL_PARTS_COPY[lang].sheet.done}</SheetCancel></div>
      {children}
    </QuietSheet>
  </li>;
}
