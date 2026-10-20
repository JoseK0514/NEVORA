"use client";

import { useLayoutEffect, useRef } from "react";

/** Keeps the selected pill of a sideways-scrolling row fully in view when the page opens (AL-47).
 * It scrolls only when the selection is cut off, and never moves focus. */
/** ST-WA-4: a row overflows only when its last pill passes the row's inner edge. scrollWidth also counts the
 * trailing padding, which faded and clipped rows whose pills fit ("Pending" cut 3px at 390). */
function overflows(row: HTMLElement, marker: HTMLElement | null) {
  const last = [...row.children].filter(child => child !== marker).at(-1);
  if (!last) return false;
  const box = row.getBoundingClientRect(), padEnd = parseFloat(getComputedStyle(row).paddingRight) || 0;
  const lastEnd = last.getBoundingClientRect().right + row.scrollLeft;
  return lastEnd > box.left + row.clientLeft + row.clientWidth - padEnd + 1;
}

/** Scrolls only when the selected pill is cut off. */
function reveal(row: HTMLElement, marker: HTMLElement | null) {
  const selected = row.querySelector<HTMLElement>('[aria-current="page"], [aria-pressed="true"]');
  if (!selected || !overflows(row, marker)) return;
  const start = selected.offsetLeft - row.offsetLeft, end = start + selected.offsetWidth;
  const fade = 28;
  if (start < row.scrollLeft) row.scrollTo({ left: Math.max(0, start - 16) });
  else if (end > row.scrollLeft + row.clientWidth - fade) row.scrollTo({ left: end - row.clientWidth + fade });
  row.setAttribute("data-start", String(row.scrollLeft > 1));
}

export function KeepSelectedVisible() {
  const marker = useRef<HTMLSpanElement>(null);
  // IS-42: only a row that really overflows gets the edge fade (data-overflow), so a row that fits shows every pill whole.
  useLayoutEffect(() => {
    const row = marker.current?.parentElement;
    if (!row) return;
    // WR-52: data-start marks a row scrolled away from its start, so it fades on the left too.
    const mark = () => { row.dataset.overflow = String(overflows(row, marker.current)); row.dataset.start = String(row.scrollLeft > 1); };
    // AL-47: a size change (larger text, turning the phone) brings a selection that is now cut off back into view.
    const resized = () => { reveal(row, marker.current); mark(); };
    mark();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resized);
    observer?.observe(row);
    // The row can keep its own size while its pills grow with the text, so watch them too.
    for (const pill of row.children) if (pill !== marker.current) observer?.observe(pill);
    row.addEventListener("scroll", mark, { passive: true });
    return () => { observer?.disconnect(); row.removeEventListener("scroll", mark); };
  }, []);
  useLayoutEffect(() => {
    const row = marker.current?.parentElement;
    if (row) reveal(row, marker.current);
  });
  return <span ref={marker} hidden />;
}
