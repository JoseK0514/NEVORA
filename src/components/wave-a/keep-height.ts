"use client";

import { useEffect, useRef } from "react";

/** ST-WA-7/8: a submit button whose words change while sending ("Deleting…", "Approving…", "Saving…") keeps the height
 * and width it had, so a two-line label at large text never shrinks to one line and pulls the page up. The height is taken when
 * the form is submitted (before the words change, at the current text size) and released when sending ends. */
export function useKeepHeight<T extends HTMLButtonElement>(pending: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const button = ref.current;
    const form = button?.form;
    if (!button || !form) return;
    // Layout sizes (offsetWidth/Height), so a press in progress (scale .98) isn't counted (ST-WA-9); width too (ST-WA-10),
    // capped at the space available, so a rotation mid-send can't push the button out of its card (ST-WA-11).
    const hold = () => { button.style.minHeight = `${button.offsetHeight}px`; button.style.minWidth = `min(${button.offsetWidth}px, 100%)`; };
    form.addEventListener("submit", hold, true);
    return () => form.removeEventListener("submit", hold, true);
  }, []);
  useEffect(() => {
    if (!pending && ref.current) { ref.current.style.minHeight = ""; ref.current.style.minWidth = ""; }
  }, [pending]);
  return ref;
}
