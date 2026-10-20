"use client";
import { useEffect, useState } from "react";

/** Clean Manager (v3): a page's tools (period stepper, Export) sit in the desktop top bar, as in the mockups, but only where
 * there is room (1180px and wider). Narrower, this returns null and the page keeps them in its own header, so the bar never
 * pushes past the edge. undefined until the first check. The slot is a plain element the page portals into; the shell's own
 * children are never touched. */
export function useTopBarSlot(enabled: boolean, className: string) {
  const [slot, setSlot] = useState<HTMLElement | null | undefined>(undefined);
  useEffect(() => {
    if (!enabled || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(min-width: 1180px)");
    let element: HTMLElement | null = null, live = true;
    const sync = () => {
      if (!live) return;
      if (!query.matches) { element?.remove(); element = null; setSlot(null); return; }
      if (element) return;
      const header = document.querySelector<HTMLElement>(".app-shell[data-nv-clean] .mobile-header");
      if (!header) { setSlot(null); return; }
      element = document.createElement("div");
      element.className = className;
      header.insertBefore(element, header.querySelector(":scope > .mobile-header-actions"));
      setSlot(element);
    };
    queueMicrotask(sync);
    query.addEventListener("change", sync);
    return () => { live = false; query.removeEventListener("change", sync); element?.remove(); setSlot(undefined); };
  }, [enabled, className]);
  return slot;
}
