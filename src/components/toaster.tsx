"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { CheckCircleIcon, InfoIcon, XIcon } from "@phosphor-icons/react/ssr";

/** Calm, Sonner-style confirmations without a dependency. Call `toast()` only
 * after the system has confirmed the outcome (a receipt, a redirect flag), never
 * optimistically. Toasts pause while hovered, focused or the tab is hidden. */
type Tone = "success" | "info";
type Toast = { id: number; message: string; tone: Tone };
const EVENT = "nevora:toast";
const DURATION = 4500;
/** Redirect flags that carry a one-time success message; removed after display. */
export const SUCCESS_FLAGS = ["submitted", "reviewed", "published", "updated", "deleted", "deadlineSaved", "claimed", "cancelled", "offered", "saved", "created"];

export function toast(message: string, tone: Tone = "success") {
  window.dispatchEvent(new CustomEvent<Omit<Toast, "id">>(EVENT, { detail: { message, tone } }));
}

function ToastItem({ item, onClose }: { item: Toast; onClose: (id: number) => void }) {
  const remaining = useRef(DURATION);
  const started = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [leaving, setLeaving] = useState(false);
  const close = () => { setLeaving(true); setTimeout(() => onClose(item.id), 180); };
  const run = () => { started.current = Date.now(); timer.current = setTimeout(close, remaining.current); };
  const pause = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; remaining.current -= Date.now() - started.current; } };
  useEffect(() => {
    run();
    const visibility = () => (document.hidden ? pause() : run());
    document.addEventListener("visibilitychange", visibility);
    return () => { pause(); document.removeEventListener("visibilitychange", visibility); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const Icon = item.tone === "success" ? CheckCircleIcon : InfoIcon;
  return <li className="nevora-toast" data-tone={item.tone} data-leaving={leaving || undefined}
    onPointerEnter={pause} onPointerLeave={run} onFocus={pause} onBlur={run}>
    <Icon size={20} weight="fill" aria-hidden="true" />
    <span>{item.message}</span>
    <button type="button" aria-label="Dismiss notification" onClick={close}><XIcon size={16} aria-hidden="true" /></button>
  </li>;
}

export function Toaster() {
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
    const present = SUCCESS_FLAGS.filter(flag => url.searchParams.has(flag));
    if (!present.length) return;
    present.forEach(flag => url.searchParams.delete(flag));
    window.history.replaceState(window.history.state, "", url);
  }, [pathname, search]);
  return <ol className="nevora-toaster" aria-live="polite" aria-label="Notifications">
    {items.map(item => <ToastItem key={item.id} item={item} onClose={id => setItems(current => current.filter(t => t.id !== id))} />)}
  </ol>;
}
