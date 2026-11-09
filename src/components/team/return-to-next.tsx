"use client";

import { useEffect, useRef } from "react";

/* Owner premium P9 (phone-native F2, F3): Return on a one-line field moves to the next field instead of submitting the
 * whole form; on a field whose key says "done" it closes the keyboard. Forms submit only from their Save, Add or Next
 * buttons. Multi-line fields keep Return for a new line. Client-only behaviour; no field, name or action changes. */
const SKIP = new Set(["checkbox", "radio", "submit", "button", "reset", "image", "file", "hidden", "search", "range", "color"]);

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
const isControl = (element: Element): element is Control =>
  element instanceof HTMLInputElement ? !SKIP.has(element.type) : element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement;
const usable = (element: Control) => !element.disabled && !(element instanceof HTMLInputElement && element.readOnly) && element.getClientRects().length > 0
  && !element.closest("[hidden], fieldset:disabled");

/** The next field after `from` in the form, in document order, or null at the end. */
export function nextField(form: HTMLFormElement, from: Element) {
  const fields = [...form.elements].filter(isControl).filter(usable);
  const index = fields.indexOf(from as Control);
  return index < 0 ? null : fields[index + 1] ?? null;
}

/** Handles Return inside one form. Exported for forms that attach it themselves. */
export function returnMovesOn(event: KeyboardEvent) {
  if (event.key !== "Enter" || event.isComposing || event.shiftKey || event.altKey || event.metaKey || event.ctrlKey) return;
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || SKIP.has(target.type) || !target.form) return;
  event.preventDefault();
  const next = target.enterKeyHint === "done" ? null : nextField(target.form, target);
  if (next) next.focus();
  else target.blur();
}

/** Drop inside a <form>: Return moves to the next field there. */
export function ReturnToNext() {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const form = marker.current?.closest("form");
    if (!form) return;
    form.addEventListener("keydown", returnMovesOn);
    return () => form.removeEventListener("keydown", returnMovesOn);
  }, []);
  return <span ref={marker} hidden />;
}
