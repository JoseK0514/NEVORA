"use client";

import { useEffect } from "react";

/* Owner premium, round 2 (R12): indicators that slide instead of jumping. Presentation only; nothing is read or written
 * but layout and CSS custom properties.
 *  - Tab rows (.c-tabs, [data-c-tabs], Payroll's .c-pay-tabs, Timecards' .c-tc-tabs, the Owner desktop section tabs): one
 *    2px teal line under the current tab (--c-x, --c-w), drawn by corp.css.
 *  - The desktop sidebar: the current entry's tint (--c-x, --c-y, --c-w, --c-h), drawn by corp-shell.css.
 *  - Segmented controls (CorpSegments): the thumb is pure CSS (--n, --i); here it only remembers where the thumb was, so a
 *    control that a page change remounts still slides from the old segment instead of appearing in place.
 * Each indicator is measured after layout, at most once a frame, and only when the page changed (a mount, a current item,
 * a size). The first time a row is seen it is placed without motion; under reduced motion the CSS has no transition. */

type Geometry = { x: number; y: number; w: number; h: number };
const TABS = ".c-tabs, [data-c-tabs], .c-pay-tabs, .c-tc-tabs, .app-shell[data-nv-clean] .page-frame > .section-tabs .section-tabs-track";
const SIDEBAR = "#desktop-primary-navigation";
const SEGMENTS = ".c-seg[data-slide]";
const CURRENT = ':scope > :is([aria-current="page"], [aria-current="true"], [aria-pressed="true"], [aria-selected="true"])';

/** Where each indicator last was, by row name, for the length of the visit (a remounted row slides from here). */
const remembered = new Map<string, Geometry | string>();

function keyOf(kind: string, element: Element) {
  return `${kind}:${element.getAttribute("aria-label") ?? element.id ?? ""}:${element.className}`;
}

function geometry(container: HTMLElement, item: HTMLElement): Geometry | null {
  const box = container.getBoundingClientRect(), rect = item.getBoundingClientRect();
  if (!rect.width || !rect.height || !box.width) return null;
  return {
    x: Math.round((rect.left - box.left - container.clientLeft + container.scrollLeft) * 10) / 10,
    y: Math.round((rect.top - box.top - container.clientTop + container.scrollTop) * 10) / 10,
    w: Math.round(rect.width * 10) / 10,
    h: Math.round(rect.height * 10) / 10,
  };
}

function same(a: Geometry | undefined | null, b: Geometry | undefined | null) {
  return !!a && !!b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

/** Writes an indicator's position. `instant` places it without a transition (first sight, resize). */
function place(container: HTMLElement, at: Geometry, vertical: boolean, instant: boolean) {
  if (instant) container.setAttribute("data-c-slide-instant", "");
  container.style.setProperty("--c-x", `${at.x}px`);
  container.style.setProperty("--c-w", vertical ? `${at.w}px` : String(at.w));
  if (vertical) { container.style.setProperty("--c-y", `${at.y}px`); container.style.setProperty("--c-h", `${at.h}px`); }
  container.setAttribute("data-c-slide-ready", "");
  if (instant) {
    // Apply the new position with the transition off, then turn it back on for the next change.
    void getComputedStyle(container, vertical ? "::before" : "::after").transform;
    container.removeAttribute("data-c-slide-instant");
  }
}

/** A streamed page's server HTML is claimed by React a little after it arrives. Until then nothing here touches it (an
 * attribute written before hydration is a mismatch), and the scan looks again shortly. React marks a claimed node with
 * its fiber key. */
function hydrated(element: Element) {
  for (const key in element) if (key.startsWith("__reactFiber$")) return true;
  return false;
}

function insideSticky(item: HTMLElement, container: HTMLElement) {
  for (let node = item.parentElement; node && node !== container; node = node.parentElement) {
    if (getComputedStyle(node).position === "sticky") return true;
  }
  return false;
}

export function CorpMotion() {
  useEffect(() => {
    const shell = document.querySelector<HTMLElement>(".app-shell");
    if (!shell) return;
    const seen = new WeakSet<Element>();
    const lastItem = new WeakMap<Element, Element>();
    const lastAt = new WeakMap<Element, Geometry>();
    const resizing = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => schedule(true));
    let frame = 0, resized = false, retry = 0, retries = 0;

    function slideRow(container: HTMLElement, vertical: boolean, kind: string) {
      const item = vertical ? container.querySelector<HTMLElement>(".nav-link.active") : container.querySelector<HTMLElement>(CURRENT);
      const at = item ? geometry(container, item) : null;
      if (!item || !at || (vertical && insideSticky(item, container))) {
        container.removeAttribute("data-c-slide-ready");
        return;
      }
      container.setAttribute("data-c-slide", vertical ? "y" : "x");
      const key = keyOf(kind, container);
      const first = !seen.has(container);
      if (first) {
        seen.add(container);
        resizing?.observe(container);
        const before = remembered.get(key);
        // A row the page change remounted starts where the old one was, then slides.
        if (before && typeof before !== "string" && !same(before, at)) { place(container, before, vertical, true); place(container, at, vertical, false); }
        else place(container, at, vertical, true);
      } else if (!same(lastAt.get(container), at)) {
        place(container, at, vertical, lastItem.get(container) === item || resized);
      }
      lastItem.set(container, item);
      lastAt.set(container, at);
      remembered.set(key, at);
    }

    function slideSegments(control: HTMLElement) {
      const key = keyOf("seg", control);
      const index = control.style.getPropertyValue("--i").trim();
      if (!seen.has(control)) {
        seen.add(control);
        const before = remembered.get(key);
        if (typeof before === "string" && before !== index && !control.hasAttribute("data-slide-none")) {
          control.setAttribute("data-c-slide-instant", "");
          control.style.setProperty("--i", before);
          void getComputedStyle(control, "::before").transform;
          control.removeAttribute("data-c-slide-instant");
          control.style.setProperty("--i", index);
        }
      }
      remembered.set(key, index);
    }

    function scan() {
      frame = 0;
      let waiting = false;
      const ready = (element: Element) => hydrated(element) || ((waiting = true), false);
      for (const row of document.querySelectorAll<HTMLElement>(TABS)) if (ready(row)) slideRow(row, false, "tabs");
      const sidebar = document.querySelector<HTMLElement>(SIDEBAR);
      if (sidebar && ready(sidebar)) slideRow(sidebar, true, "sidebar");
      for (const control of document.querySelectorAll<HTMLElement>(SEGMENTS)) if (ready(control)) slideSegments(control);
      resized = false;
      // Look again while a streamed part waits for hydration, for a few seconds at most (a page change starts over).
      if (waiting && !retry && retries < 40) retry = window.setTimeout(() => { retry = 0; retries += 1; schedule(); }, 150);
    }
    function schedule(fromResize = false) {
      resized = resized || fromResize;
      if (!frame) frame = requestAnimationFrame(scan);
    }

    const changes = new MutationObserver(() => { retries = 0; schedule(); });
    changes.observe(shell, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-current", "aria-pressed", "aria-selected", "data-collapsed"] });
    const onResize = () => schedule(true);
    window.addEventListener("resize", onResize);
    // Web fonts change tab widths once they load.
    void document.fonts?.ready.then(() => schedule(true));
    schedule();
    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (retry) window.clearTimeout(retry);
      changes.disconnect();
      resizing?.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);
  return null;
}
