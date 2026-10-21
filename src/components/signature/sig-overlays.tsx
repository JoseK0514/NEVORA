"use client";

import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/* Signature overlays: the bottom sheet and the toast. Both are styled in components.css and follow the motion tokens
 * (sheet 280ms rise, state 180ms fade); under reduced motion they only fade. */

/** A bottom sheet on phones (a centred panel from 768px): a native modal <dialog>, so focus is trapped, Escape closes
 * it and focus returns to what opened it. Focus starts on the panel. A drag handle shows it is a sheet; the content keeps clear of the home
 * indicator (safe area). Tapping the dimmed backdrop closes it. */
export function SigSheet({ open, onClose, title, children, closeLabel = "Close" }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; closeLabel?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    // Focus starts on the sheet itself (announced by its title), not on Close, so a tap doesn't flash a ring on the X;
    // the next Tab reaches Close and the content.
    if (open && !element.open) { element.showModal(); panel.current?.focus({ preventScroll: true }); }
    if (!open && element.open) element.close();
  }, [open]);
  return <dialog ref={dialog} className="sig-sheet" aria-labelledby={titleId} onClose={() => { if (open) onClose(); }}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={panel} className="sig-sheet__panel" tabIndex={-1}>
      <span className="sig-sheet__handle" aria-hidden="true" />
      <header className="sig-sheet__head">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="sig-sheet__close" onClick={onClose} aria-label={closeLabel}><XIcon size={20} aria-hidden="true" /></button>
      </header>
      <div className="sig-sheet__body">{children}</div>
    </div>
  </dialog>;
}

/** A short confirmation at the bottom of the screen, above the tab bar, with an optional Undo. It is announced
 * politely, waits while the pointer or focus is on it, and leaves after `duration` ms (never while Undo is focused). */
export function SigToast({ message, action, onDismiss, duration = 6000, dismissLabel = "Dismiss" }: {
  message: ReactNode; action?: { label: string; onClick: () => void }; onDismiss: () => void; duration?: number; dismissLabel?: string;
}) {
  const [held, setHeld] = useState(false);
  const dismiss = useRef(onDismiss);
  useEffect(() => { dismiss.current = onDismiss; }, [onDismiss]);
  useEffect(() => {
    if (held || duration <= 0) return;
    const timer = window.setTimeout(() => dismiss.current(), duration);
    return () => window.clearTimeout(timer);
  }, [held, duration]);
  return <div className="sig-toast"
    onPointerEnter={() => setHeld(true)} onPointerLeave={() => setHeld(false)}
    onFocus={() => setHeld(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHeld(false); }}>
    <p className="sig-toast__message" role="status" aria-live="polite">{message}</p>
    {action ? <button type="button" className="sig-toast__action" onClick={() => { action.onClick(); onDismiss(); }}>{action.label}</button> : null}
    <button type="button" className="sig-toast__close" onClick={onDismiss} aria-label={dismissLabel}><XIcon size={18} aria-hidden="true" /></button>
  </div>;
}
