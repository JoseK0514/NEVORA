"use client";

import { useLayoutEffect, useRef } from "react";

/** Keeps the selected pill of a sideways-scrolling row fully in view when the page opens (AL-47).
 * It scrolls only when the selection is cut off, and never moves focus. */
export function KeepSelectedVisible() {
  const marker = useRef<HTMLSpanElement>(null);
  // IS-42: only a row that really overflows gets the edge fade (data-overflow), so a row that fits shows every pill whole.
  useLayoutEffect(() => {
    const row = marker.current?.parentElement;
    if (!row) return;
    // WR-52: data-start marks a row scrolled away from its start, so it fades on the left too.
    const mark = () => { row.dataset.overflow = String(row.scrollWidth > row.clientWidth + 1); row.dataset.start = String(row.scrollLeft > 1); };
    mark();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(mark);
    observer?.observe(row);
    row.addEventListener("scroll", mark, { passive: true });
    return () => { observer?.disconnect(); row.removeEventListener("scroll", mark); };
  }, []);
  useLayoutEffect(() => {
    const row = marker.current?.parentElement;
    const selected = row?.querySelector<HTMLElement>('[aria-current="page"], [aria-pressed="true"]');
    if (!row || !selected || row.scrollWidth <= row.clientWidth) return;
    const start = selected.offsetLeft - row.offsetLeft, end = start + selected.offsetWidth;
    const fade = 28;
    if (start < row.scrollLeft) row.scrollTo({ left: Math.max(0, start - 16) });
    else if (end > row.scrollLeft + row.clientWidth - fade) row.scrollTo({ left: end - row.clientWidth + fade });
    row.setAttribute("data-start", String(row.scrollLeft > 1));
  });
  return <span ref={marker} hidden />;
}
