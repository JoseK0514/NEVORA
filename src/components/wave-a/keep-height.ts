"use client";

import { useEffect, useRef } from "react";

/** ST-WA-7/8: a submit button whose words change while sending ("Deleting…", "Approving…", "Saving…") keeps the height
 * it had, so a two-line label at large text never shrinks to one line and pulls the page up. The height is taken when
 * the form is submitted (before the words change, at the current text size) and released when sending ends. */
export function useKeepHeight<T extends HTMLButtonElement>(pending: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const button = ref.current;
    const form = button?.form;
    if (!button || !form) return;
    const hold = () => { button.style.minHeight = `${button.getBoundingClientRect().height}px`; };
    form.addEventListener("submit", hold, true);
    return () => form.removeEventListener("submit", hold, true);
  }, []);
  useEffect(() => {
    if (!pending && ref.current) ref.current.style.minHeight = "";
  }, [pending]);
  return ref;
}
