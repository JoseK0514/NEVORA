"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";

/* Jose (Nov 21, 2026): every Decline, and Finalize on a timecard, asks first. This is the one step they share, in front
 * of the commit each surface already had: the question (`DecisionAsk`, decision-parts.tsx) takes the place of the row's
 * or the footer's buttons. Nothing is sent when it opens and nothing when it is dismissed; the commit is the caller's.
 * - Focus moves to the question when it opens and back to the button that opened it when it is dismissed.
 * - Escape dismisses it (before a sheet behind it hears the key).
 * - One question at a time: opening another closes this one, without moving focus. */
const OPENED = "nevora:decision-ask";

export function useAskStep<Opener extends HTMLElement = HTMLButtonElement>() {
  const id = useId();
  const [open, setOpen] = useState(false);
  const titleRef = useRef<HTMLParagraphElement>(null), openerRef = useRef<Opener>(null), giveBack = useRef(false);
  /** Open the question. */
  const ask = useCallback(() => { window.dispatchEvent(new CustomEvent(OPENED, { detail: id })); setOpen(true); }, [id]);
  /** The safe way out: close it and give focus back to the button that opened it. */
  const keep = useCallback(() => { giveBack.current = true; setOpen(false); }, []);
  /** Close it with no focus move (the commit went out, or the row is gone). */
  const done = useCallback(() => setOpen(false), []);
  useEffect(() => {
    if (!open) {
      if (giveBack.current) { giveBack.current = false; (openerRef.current ?? document.querySelector<HTMLElement>(`[data-ask-opener="${CSS.escape(id)}"]`))?.focus(); }
      return;
    }
    titleRef.current?.focus();
    const other = (event: Event) => { if ((event as CustomEvent<string>).detail !== id) setOpen(false); };
    const key = (event: KeyboardEvent) => { if (event.key !== "Escape") return; event.preventDefault(); event.stopPropagation(); giveBack.current = true; setOpen(false); };
    window.addEventListener(OPENED, other);
    document.addEventListener("keydown", key, true);
    return () => { window.removeEventListener(OPENED, other); document.removeEventListener("keydown", key, true); };
  }, [open, id]);
  /** `titleRef` goes on the question (DecisionAsk), `openerRef` on the button that opens it; a button that takes no ref
   * carries `mark` instead. Callers take these apart at the call, so a ref is only ever handed to an element. */
  return { open, ask, keep, done, titleRef, openerRef, mark: { "data-ask-opener": id } };
}
