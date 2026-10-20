"use client";

import { useEffect } from "react";

/** WCAG 2.4.11: a control reached by keyboard is never left behind the fixed tab bar or save bar.
 * Browsers skip scrolling when a field is partly on screen (WebKit ignores scroll padding then),
 * so after focus moves we nudge the page until the field sits 16px above the highest bottom bar. */
export function FocusClear() {
  useEffect(() => {
    const clear = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.closest(".wc-page") || target.closest(".nv-actionbar, dialog")) return;
      requestAnimationFrame(() => {
        const covers = [...document.querySelectorAll<HTMLElement>(".mobile-nav, .wc-page .nv-actionbar")]
          .map(bar => ({ style: getComputedStyle(bar), box: bar.getBoundingClientRect() }))
          .filter(({ style, box }) => box.height > 0 && style.display !== "none"
            && (style.position === "fixed" || (style.position === "sticky" && box.bottom >= window.innerHeight - 2)))
          .map(({ box }) => box.top);
        if (!covers.length) return;
        const limit = Math.min(...covers) - 16, box = target.getBoundingClientRect();
        const room = box.top - 72; // keep the field below the sticky header
        if (box.bottom > limit && room > 0) window.scrollBy({ top: Math.min(box.bottom - limit, room), behavior: "instant" });
      });
    };
    document.addEventListener("focusin", clear);
    return () => document.removeEventListener("focusin", clear);
  }, []);
  return null;
}
