"use client";
import { useEffect, useState } from "react";

/** Clean Manager (v3): a page's tools (period stepper, Export) sit in the desktop top bar, as in the mockups, but only where
 * there is room (1300px and wider). Narrower, this returns null and the page keeps them in its own header, so the bar never
 * pushes past the edge. undefined until the first check. The slot is a plain element the page portals into; the shell's own
 * children are never touched. */
export function useTopBarSlot(enabled: boolean, className: string) {
  const [slot, setSlot] = useState<HTMLElement | null | undefined>(undefined);
  useEffect(() => {
    // A test document without querySelector (or no matchMedia) keeps the tools in the page.
    if (!enabled || typeof window.matchMedia !== "function" || typeof document.querySelector !== "function") return;
    const query = window.matchMedia("(min-width: 1300px)");
    let element: HTMLElement | null = null, live = true;
    // Final pass P1-3: the bar has room only when the width scales with the text (1300px at 100%, 2360px at 200%).
    // Final pass: 1300px, not 1180 — at 1180 the stepper and Export squeezed the page crumb to nothing.
    const roomy = () => { const scale = (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16) / 16; return query.matches && window.innerWidth >= 1300 * scale; };
    const sync = () => {
      if (!live) return;
      const fits = roomy();
      document.documentElement.dataset.cmTopbar = fits ? "1" : "0";
      if (!fits) { element?.remove(); element = null; setSlot(null); return; }
      if (element) return;
      const header = document.querySelector<HTMLElement>(".app-shell[data-nv-clean] .mobile-header");
      if (!header) { setSlot(null); return; }
      element = document.createElement("div");
      element.className = className;
      header.insertBefore(element, header.querySelector(":scope > .mobile-header-actions"));
      setSlot(element);
    };
    queueMicrotask(sync);
    query.addEventListener("change", sync); window.addEventListener("resize", sync);
    return () => { live = false; query.removeEventListener("change", sync); window.removeEventListener("resize", sync); element?.remove(); setSlot(undefined); };
  }, [enabled, className]);
  return slot;
}
