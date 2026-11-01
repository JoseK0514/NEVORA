"use client";

import { useEffect, useRef, type RefObject } from "react";

/** How long a pointer or keyboard focus rests on a rail entry before its name shows (upscale M1). */
export const RAIL_TIP_DELAY_MS = 300;
/** A short grace before hiding, so the pointer can cross the 8px gap onto the tip without losing it (WCAG 1.4.13). */
const HIDE_GRACE_MS = 100;
const TARGETS = ".nav-link, .sidebar-toggle, .cm-org";

/** The name a rail entry shows: its label, then a count when it has one ("Things to do · 6"). */
export function railTipText(target: Element): string {
  if (target.matches(".sidebar-toggle")) return target.getAttribute("aria-label") ?? "";
  if (target.matches(".cm-org")) return target.querySelector(".cm-org__name")?.textContent?.trim() ?? "";
  const label = target.querySelector(".nav-label")?.textContent?.trim() ?? target.getAttribute("aria-label") ?? "";
  const count = target.querySelector(".nav-count")?.textContent?.trim();
  return count ? `${label} · ${count}` : label;
}

/**
 * Upscale M1: in the collapsed sidebar rail, an entry names itself in a dark tip 8px right of the rail after 300ms of
 * hover or keyboard focus. One fixed element outside the sidebar, so the sidebar's scrolling never clips it. The tip
 * repeats the entry's accessible name (the visually hidden label), so it is hidden from assistive technology; Escape
 * dismisses it, and the pointer can move onto it without it disappearing.
 */
export function SidebarRailTooltip({ sidebar, enabled }: { sidebar: RefObject<HTMLElement | null>; enabled: boolean }) {
  const tip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const aside = sidebar.current, element = tip.current;
    if (!aside || !element || !enabled) return;
    let showTimer = 0, hideTimer = 0, current: HTMLElement | null = null;

    const hide = () => {
      window.clearTimeout(showTimer); window.clearTimeout(hideTimer);
      current = null;
      element.removeAttribute("data-open");
    };
    const place = (target: HTMLElement) => {
      const text = railTipText(target);
      // The rail only: when the sidebar is the full list (a width change before the next render), no tip.
      if (!text || aside.getBoundingClientRect().width > 120) return;
      element.textContent = text;
      const box = target.getBoundingClientRect(), rail = aside.getBoundingClientRect();
      element.style.left = `${Math.round(rail.right + 8)}px`;
      element.style.top = `${Math.round(box.top + box.height / 2)}px`;
      element.setAttribute("data-open", "");
    };
    const schedule = (target: HTMLElement) => {
      window.clearTimeout(hideTimer);
      if (current === target) return;
      const wasOpen = element.hasAttribute("data-open");
      current = target;
      window.clearTimeout(showTimer);
      // Moving between entries while a tip is up re-labels it at once, as native tooltips do.
      if (wasOpen) place(target);
      else showTimer = window.setTimeout(() => { if (current === target) place(target); }, RAIL_TIP_DELAY_MS);
    };
    const leaveSoon = () => {
      window.clearTimeout(showTimer); window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(hide, HIDE_GRACE_MS);
    };

    const over = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const target = (event.target as Element | null)?.closest<HTMLElement>(TARGETS);
      if (target && aside.contains(target)) schedule(target); else leaveSoon();
    };
    const out = (event: PointerEvent) => {
      const next = event.relatedTarget as Node | null;
      if (next && (element.contains(next) || (aside.contains(next) && (next as Element).closest?.(TARGETS)))) return;
      leaveSoon();
    };
    const focusIn = (event: FocusEvent) => {
      const target = (event.target as Element | null)?.closest<HTMLElement>(TARGETS);
      if (target && target.matches(":focus-visible")) schedule(target);
    };
    const keys = (event: KeyboardEvent) => { if (event.key === "Escape" && element.hasAttribute("data-open")) hide(); };
    const stayOnTip = () => window.clearTimeout(hideTimer);

    aside.addEventListener("pointerover", over);
    aside.addEventListener("pointerout", out);
    aside.addEventListener("focusin", focusIn);
    aside.addEventListener("focusout", hide);
    aside.addEventListener("pointerdown", hide);
    aside.addEventListener("scroll", hide, true);
    element.addEventListener("pointerenter", stayOnTip);
    element.addEventListener("pointerleave", leaveSoon);
    document.addEventListener("keydown", keys);
    window.addEventListener("resize", hide);
    return () => {
      hide();
      aside.removeEventListener("pointerover", over);
      aside.removeEventListener("pointerout", out);
      aside.removeEventListener("focusin", focusIn);
      aside.removeEventListener("focusout", hide);
      aside.removeEventListener("pointerdown", hide);
      aside.removeEventListener("scroll", hide, true);
      element.removeEventListener("pointerenter", stayOnTip);
      element.removeEventListener("pointerleave", leaveSoon);
      document.removeEventListener("keydown", keys);
      window.removeEventListener("resize", hide);
    };
  }, [sidebar, enabled]);
  return <div ref={tip} className="c-rail-tip" aria-hidden="true" />;
}
