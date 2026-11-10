'use client';

import Link from 'next/link';
import {usePathname, useRouter} from 'next/navigation';
import {createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode} from 'react';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';

/* v5 "One look" bottom sheet (approved Oct 24, 2026; mockups E03–E05 and E08). A native modal dialog, so focus stays
 * inside, Escape closes and the page behind is inert. It rises over the page with a grabber; drag the top down or
 * tap outside to close. Wide screens get a centred card. Reduced motion: no travel. */

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

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** `modal={false}` (Owner Timecards on wide screens, Nov 1 upscale): the same panel opened as a non-modal inspector, so
 * the page behind stays live and unlocked: no scrim, focus stays where it was, Escape still closes it (and its onClose
 * returns focus), and a click outside doesn't close it. Every other sheet is modal, as before. */
export function QuietSheet({open, onClose, label, labelledBy, children, modal = true}: {open: boolean; onClose: () => void; label?: string; labelledBy?: string; children: ReactNode; modal?: boolean}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closing = useRef(false);
  const drag = useRef<{y: number; t: number; dy: number} | null>(null);

  const close = useCallback(() => {
    const node = dialog.current;
    if (!node || closing.current) return;
    closing.current = true;
    const done = () => { closing.current = false; node.removeAttribute('data-closing'); node.style.transform = ''; if (node.open) node.close(); onClose(); };
    if (reducedMotion()) { done(); return; }
    node.setAttribute('data-closing', '');
    node.style.transform = '';
    window.setTimeout(done, 240);
  }, [onClose]);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) {
      node.removeAttribute('data-closing');
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
    if (!open && node.open) node.close();
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

  return <dialog ref={dialog} className="q-page q-sheet" aria-label={label} aria-labelledby={labelledBy} tabIndex={-1}
    // A tap on the dim area outside the sheet (the dialog's own box, not its content) closes it.
    onClick={event => { if (modal && event.target === event.currentTarget) close(); }}
    onPointerDown={event => {
      const target = event.target as HTMLElement;
      if (!target.closest('.q-sheet__top') || target.closest('a, button, input, textarea, select, label')) return;
      drag.current = {y: event.clientY, t: performance.now(), dy: 0};
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
      if (state.dy > 120 || velocity > 0.5) close();
      else { node.style.transition = 'transform 200ms cubic-bezier(.23, 1, .32, 1)'; node.style.transform = ''; window.setTimeout(() => { node.style.transition = ''; }, 220); }
    }}
    onPointerCancel={event => { drag.current = null; (event.currentTarget as HTMLElement).style.transform = ''; }}>
    <SheetClose.Provider value={close}>
      <div className="q-sheet__in">
        <div className="q-sheet__top"><div className="q-sheet__grab" aria-hidden="true"/></div>
        {children}
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
  if (!new RegExp(match).test(pathname)) return null;
  return <QuietSheet open label={label} onClose={() => {
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
export function SheetCancel({href, children = 'Cancel', className = 'q-nav__l q-nav__l--teal'}: {href: string; children?: ReactNode; className?: string}) {
  const close = useSheetClose();
  if (close) return <button type="button" className={className} onClick={close}>{children}</button>;
  return <Link className={className} href={href}>{children}</Link>;
}

/** A row that opens its details as a sheet (a request, a decided item). `anchor` (an element id) also opens it when the
 * page is reached with that #hash, so links that point at the item still land on it. */
export function SheetRow({ title, detail, value, sheetTitle, anchor, avatar, status, children }: { title: ReactNode; detail?: ReactNode; value?: ReactNode; sheetTitle: string; anchor?: string; avatar?: ReactNode; /** The item's state, kept on the row for its readers (data-employee-status). */ status?: string; children: ReactNode }) {
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
      <CaretRightIcon className="q-chev" aria-hidden="true" />
    </button>
    <QuietSheet open={open} label={sheetTitle} onClose={() => {
      setOpen(false);
      if (anchor && window.location.hash === `#${anchor}`) history.replaceState(history.state, '', window.location.pathname + window.location.search);
    }}>
      <div className="q-nav"><span /><span className="q-nav__t">{sheetTitle}</span><SheetCancel href="#" className="q-nav__r q-nav__r--b">Done</SheetCancel></div>
      {children}
    </QuietSheet>
  </li>;
}
