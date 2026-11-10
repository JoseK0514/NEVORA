"use client";

import { useEffect } from "react";

/** Review B4 (Nov 10, 2026, NV-201): from 1024px a policy reads as one continuous card, every section open, with the
 * contents list beside it as navigation; phones and tablets keep the closed sections. Without JavaScript the sections stay
 * closed, as before. Each section can still be closed by hand. */
export function OpenOnDesktop({ list }: { list: string }) {
  useEffect(() => {
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
    document.getElementById(list)?.querySelectorAll("details").forEach(section => { section.open = true; });
  }, [list]);
  return null;
}
