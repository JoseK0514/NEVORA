"use client";

import { useLayoutEffect, useRef } from "react";

/** ST-WA-7/8: a button whose words change while sending ("Deleting…", "Approving…", "Saving…") keeps the height it had,
 * so a two-line label at large text never shrinks to one line and pulls the page up. The height is measured while idle;
 * when pending starts, the hold is set before paint without reading layout first (no scroll clamp). */
export function useKeepHeight<T extends HTMLElement>(pending: boolean) {
  const ref = useRef<T>(null);
  const last = useRef(0);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (pending) {
      if (last.current) element.style.minHeight = `${last.current}px`;
      return;
    }
    element.style.minHeight = "";
    last.current = element.getBoundingClientRect().height;
  });
  return ref;
}
