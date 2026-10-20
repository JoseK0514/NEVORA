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

/** Filter tracks that scroll sideways (phones): the selected filter starts in view, and each edge fades only while
 * more filters wait past it. The fade is driven here so it looks the same in WebKit, which has no scroll timelines. */
export function PillTracks() {
  useEffect(() => {
    const page = document.querySelector<HTMLElement>(".wc-page");
    if (!page) return;
    const edge = 28;
    const update = (track: HTMLElement) => {
      const max = track.scrollWidth - track.clientWidth;
      track.dataset.overflow = max <= 1 ? "none" : track.scrollLeft <= 1 ? "start" : track.scrollLeft >= max - 1 ? "end" : "middle";
    };
    const reveal = (track: HTMLElement) => {
      const selected = track.querySelector<HTMLElement>('[aria-pressed="true"], [aria-current="page"]');
      if (!selected || track.scrollWidth <= track.clientWidth) return;
      const box = track.getBoundingClientRect(), item = selected.getBoundingClientRect();
      if (item.left < box.left + edge) track.scrollLeft -= box.left + edge - item.left;
      else if (item.right > box.right - edge) track.scrollLeft += item.right - (box.right - edge);
    };
    const bound = new WeakSet<HTMLElement>();
    // Watch the filters too: a larger text size widens them without resizing the track.
    const sizes = new ResizeObserver(entries => entries.forEach(entry => {
      const track = (entry.target as HTMLElement).closest<HTMLElement>(".wc-pills");
      if (track) update(track);
    }));
    let frame = 0;
    const scan = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => page.querySelectorAll<HTMLElement>(".wc-pills:not(.wc-segmented)").forEach(track => {
        if (!bound.has(track)) {
          bound.add(track);
          track.addEventListener("scroll", () => update(track), { passive: true });
          sizes.observe(track);
        }
        track.querySelectorAll<HTMLElement>(":scope > .nv-filter").forEach(item => sizes.observe(item));
        reveal(track);
        update(track);
      }));
    };
    const changes = new MutationObserver(scan);
    changes.observe(page, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-pressed", "aria-current"] });
    scan();
    return () => { cancelAnimationFrame(frame); changes.disconnect(); sizes.disconnect(); };
  }, []);
  return null;
}
