"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { CheckIcon, InfoIcon, XIcon } from "@phosphor-icons/react/ssr";
import { overlayExitMs } from "./kit/overlay-exit";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { SHELL_WORDS } from "./shell-copy";

/** Calm, Sonner-style confirmations without a dependency. Call `toast()` only
 * after the system has confirmed the outcome (a receipt, a redirect flag), never
 * optimistically. Toasts pause while hovered, focused or the tab is hidden. */
type Tone = "success" | "info";
type Toast = { id: number; message: string; tone: Tone };
const EVENT = "nevora:toast";
const DURATION = 4500;
/** Redirect flags that carry a one-time success message; removed after display. */
export const SUCCESS_FLAGS = ["submitted", "reviewed", "published", "updated", "deleted", "deadlineSaved", "claimed", "cancelled", "offered", "saved", "created"];

/** D-5: a focused review returns with ?decided=; the page it returns to confirms the outcome once. */
export const DECISION_MESSAGES: Record<string, string> = {
  // Final polish (confirmations review A #14): one fact. The flag carries no name, so the toast names none (it said "The
  // employee"); the person's name is on the row and the page this returns to.
  "timeoff-approved": "Time off approved",
  "timeoff-declined": "Time off declined",
};

export function toast(message: string, tone: Tone = "success") {
  window.dispatchEvent(new CustomEvent<Omit<Toast, "id">>(EVENT, { detail: { message, tone } }));
}

function ToastItem({ item, onClose }: { item: Toast; onClose: (id: number) => void }) {
  const remaining = useRef(DURATION);
  const started = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [leaving, setLeaving] = useState(false);
  // It holds while the pointer is over it or focus is inside it (IS-26); either one keeps it open.
  const hovered = useRef(false), focused = useRef(false), self = useRef<HTMLLIElement>(null);
  const close = () => {
    // Focus inside the toast moves to the page, not to nowhere, when it closes.
    if (self.current?.contains(document.activeElement)) document.getElementById("main-content")?.focus({ preventScroll: true });
    // Phase 7: the one exit (150ms, b-motion.css); under reduced motion the toast is gone at once.
    const exit = overlayExitMs();
    if (!exit) { onClose(item.id); return; }
    setLeaving(true); setTimeout(() => onClose(item.id), exit);
  };
  const run = () => { if (timer.current || hovered.current || focused.current || document.hidden) return; started.current = Date.now(); timer.current = setTimeout(close, remaining.current); };
  const pause = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; remaining.current -= Date.now() - started.current; } };
  useEffect(() => {
    run();
    const visibility = () => (document.hidden ? pause() : run());
    document.addEventListener("visibilitychange", visibility);
    return () => { pause(); document.removeEventListener("visibilitychange", visibility); };
    // eslint-disable-next-line hooks-preserved/exhaustive-deps
  }, []);
  // Phase 9 (Nov 18, 2026): the done mark for a result (a bold check in a green-50 circle), the information glyph in
  // teal-50 for a note; bold, never filled (b-foundation.css draws the circle and Direction B's surface).
  const Icon = item.tone === "success" ? CheckIcon : InfoIcon;
  return <li ref={self} className="nevora-toast" data-tone={item.tone} data-leaving={leaving || undefined}
    onPointerEnter={() => { hovered.current = true; pause(); }} onPointerLeave={() => { hovered.current = false; run(); }}
    onFocus={() => { focused.current = true; pause(); }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { focused.current = false; run(); } }}>
    <span className="nevora-toast__ic" aria-hidden="true"><Icon size={16} weight="bold" /></span>
    <span>{item.message}</span>
    <button type="button" aria-label={SHELL_WORDS[usePortalLang()].toastDismiss} onClick={close}><XIcon size={16} weight="bold" aria-hidden="true" /></button>
  </li>;
}

export function Toaster() {
  const W = SHELL_WORDS[usePortalLang()];
  const [items, setItems] = useState<Toast[]>([]);
  const next = useRef(1);
  useEffect(() => {
    const add = (event: Event) => {
      const { message, tone } = (event as CustomEvent<Omit<Toast, "id">>).detail;
      setItems(current => [...current.slice(-2), { id: next.current++, message, tone }]);
    };
    window.addEventListener(EVENT, add);
    return () => window.removeEventListener(EVENT, add);
  }, []);
  // One-time redirect flags: the page shows its success banner (styled as a
  // toast); drop the flag after every navigation so a reload doesn't repeat it.
  const pathname = usePathname(), search = useSearchParams()?.toString() ?? "";
  useEffect(() => {
    const url = new URL(window.location.href);
    const decided = url.searchParams.get("decided");
    if (decided !== null) {
      // Final polish (said once): Team time off draws the decision's result inline in its list, so no toast there.
      // Signed-in Spanish: the two decision toasts in the person's language (their English is DECISION_MESSAGES).
      const message = decided === "timeoff-approved" ? W.timeOffApproved : decided === "timeoff-declined" ? W.timeOffDeclined : DECISION_MESSAGES[decided];
      if (message && pathname !== "/app/requests") toast(message);
      url.searchParams.delete("decided");
    }
    const present = SUCCESS_FLAGS.filter(flag => url.searchParams.has(flag));
    if (!present.length && decided === null) return;
    present.forEach(flag => url.searchParams.delete(flag));
    window.history.replaceState(window.history.state, "", url);
  }, [pathname, search, W]);
  return <ol className="nevora-toaster" aria-live="polite" aria-label={W.toastMessages}>
    {items.map(item => <ToastItem key={item.id} item={item} onClose={id => setItems(current => current.filter(t => t.id !== id))} />)}
  </ol>;
}
