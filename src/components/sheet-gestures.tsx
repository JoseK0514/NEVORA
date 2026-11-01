"use client";

import { useEffect } from "react";

/** Phone sheets (popovers styled with --sheet: 1) can be swiped down to close.
 * Direct manipulation per Apple's fluid-interface guidance and Emil Kowalski's
 * drawer rules: the sheet follows the finger 1:1 from where it was grabbed,
 * resists upward drags, and a quick flick closes it as well as distance does.
 * Only transforms are written; CSS owns the open/close transitions, so a
 * release continues from the sheet's live position. */
const SHEET_SELECTOR = "[popover]:popover-open";
/** Review fix (37/50): engines without the :popover-open selector (Safari 16) threw a SyntaxError from closest()
 * and querySelectorAll(); without popover support there is no sheet to drag, so both degrade to "none". */
function closestSheet(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) return null;
  try { return target.closest(SHEET_SELECTOR); } catch { return null; }
}
function openSheets(): HTMLElement[] {
  try { return Array.from(document.querySelectorAll<HTMLElement>(SHEET_SELECTOR)); } catch { return []; }
}
const DIRECTION_SLOP = 10;      // px of movement before the gesture commits
const DISMISS_FRACTION = 0.3;   // of the sheet height
const FLICK_VELOCITY = 0.11;    // px per ms
const FLICK_MIN_TRAVEL = 24;    // px, so a tap-and-twitch never dismisses

function isSheet(element: Element): element is HTMLElement {
  return element instanceof HTMLElement && getComputedStyle(element).getPropertyValue("--sheet").trim() === "1";
}

/** The further past the top the user drags, the less the sheet follows. */
function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/** Owner premium (phone-native M4): engines that cannot keep a closing popover in the top layer (WebKit has no
 * `overlay` transition) remove a sheet on the next frame. There, a closing sheet leaves a short-lived, inert copy that
 * finishes the same exit (240ms, from wherever the sheet was, e.g. mid-swipe), with the dimmed page fading back. */
function animateExit(sheet: HTMLElement) {
  if (typeof CSS === "undefined" || CSS.supports("overlay", "auto")) return;
  const host = sheet.closest(".app-shell") ?? sheet.parentElement;
  const rect = sheet.getBoundingClientRect();
  if (!host || !rect.height) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ghost = sheet.cloneNode(true) as HTMLElement;
  ghost.removeAttribute("id"); ghost.removeAttribute("popover"); ghost.removeAttribute("role"); ghost.removeAttribute("aria-modal");
  ghost.querySelectorAll("[id]").forEach(node => node.removeAttribute("id"));
  ghost.setAttribute("aria-hidden", "true"); ghost.setAttribute("inert", ""); ghost.setAttribute("data-sheet-ghost", "");
  Object.assign(ghost.style, { position: "fixed", top: `${rect.top}px`, left: `${rect.left}px`, right: "auto", bottom: "auto", width: `${rect.width}px`, height: `${rect.height}px`,
    maxHeight: "none", margin: "0", transform: "none", transition: "none", opacity: "1", zIndex: "2147483646", pointerEvents: "none", display: getComputedStyle(sheet).display === "none" ? "block" : getComputedStyle(sheet).display });
  const scrim = document.createElement("div");
  Object.assign(scrim.style, { position: "fixed", inset: "0", zIndex: "2147483645", background: "rgba(28, 28, 28, .28)", pointerEvents: "none" });
  scrim.setAttribute("aria-hidden", "true");
  host.append(scrim, ghost);
  const distance = window.innerHeight - rect.top + 32;
  const duration = reduce ? 120 : Math.max(120, Math.round(240 * Math.min(1, distance / Math.max(1, rect.height + 32))));
  const easing = "cubic-bezier(.32, .72, 0, 1)";
  const done = () => { ghost.remove(); scrim.remove(); };
  try {
    const motion = reduce
      ? ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing: "ease-out", fill: "forwards" })
      : ghost.animate([{ transform: "translateY(0)" }, { transform: `translateY(${distance}px)` }], { duration, easing, fill: "forwards" });
    scrim.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing: "ease-out", fill: "forwards" });
    motion.finished.then(done, done);
    window.setTimeout(done, duration + 120);
  } catch { done(); }
}

/** Owner premium (phone-native S5): while any phone sheet or modal dialog is open, the page behind it doesn't scroll. */
function syncPageLock() {
  let modal = false;
  try { modal = !!document.querySelector("dialog[open]:modal"); } catch { modal = !!document.querySelector("dialog[open]"); }
  const locked = modal || openSheets().some(isSheet);
  document.documentElement.toggleAttribute("data-c-lock", locked);
}

export function SheetGestures() {
  useEffect(() => {
    let sheet: HTMLElement | null = null;
    let pointerId: number | null = null;
    let startY = 0, startX = 0, lastY = 0, lastTime = 0, velocity = 0;
    let committed = false;

    const reset = () => {
      if (sheet) { sheet.removeAttribute("data-sheet-dragging"); sheet.style.transform = ""; }
      sheet = null; pointerId = null; committed = false; velocity = 0;
    };

    const onDown = (event: PointerEvent) => {
      if (pointerId !== null || !event.isPrimary) return; // ignore extra touches mid-drag
      const target = closestSheet(event.target);
      if (!target || !isSheet(target)) return;
      // Let content scroll first; only a sheet scrolled to the top starts a drag.
      if (target.scrollTop > 0) return;
      sheet = target; pointerId = event.pointerId;
      startY = lastY = event.clientY; startX = event.clientX; lastTime = event.timeStamp;
    };

    const onMove = (event: PointerEvent) => {
      if (!sheet || event.pointerId !== pointerId) return;
      const dy = event.clientY - startY, dx = event.clientX - startX;
      if (!committed) {
        if (Math.abs(dy) < DIRECTION_SLOP && Math.abs(dx) < DIRECTION_SLOP) return;
        if (Math.abs(dx) > Math.abs(dy) || dy < 0) { reset(); return; } // horizontal or upward: not a dismiss
        committed = true;
        sheet.setAttribute("data-sheet-dragging", "true");
        try { sheet.setPointerCapture(event.pointerId); } catch { /* Pointer already released. */ }
      }
      const elapsed = Math.max(1, event.timeStamp - lastTime);
      velocity = (event.clientY - lastY) / elapsed;
      lastY = event.clientY; lastTime = event.timeStamp;
      const offset = dy >= 0 ? dy : rubberband(dy, sheet.offsetHeight);
      sheet.style.transform = `translateY(${offset}px)`;
      event.preventDefault();
    };

    const onUp = (event: PointerEvent) => {
      if (!sheet || event.pointerId !== pointerId) return;
      if (!committed) { reset(); return; }
      const current = sheet;
      const travelled = event.clientY - startY;
      const dismiss = travelled > current.offsetHeight * DISMISS_FRACTION || (velocity > FLICK_VELOCITY && travelled > FLICK_MIN_TRAVEL);
      // Hand the live position back to CSS: the close transition runs from here.
      current.removeAttribute("data-sheet-dragging");
      if (dismiss) {
        // Suppress the click that ends a drag so a link under the finger doesn't fire.
        const swallow = (click: Event) => { click.stopPropagation(); click.preventDefault(); };
        window.addEventListener("click", swallow, { capture: true, once: true });
        setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
        // Close first, from the dragged position (the exit continues from there), then hand the transform back.
        current.hidePopover();
        current.style.transform = "";
      } else {
        current.style.transform = "";
      }
      sheet = null; pointerId = null; committed = false; velocity = 0;
    };

    // A tap outside an open phone sheet only closes it (phone polish A2.10). The browser's
    // light dismiss closes the sheet on that press, and the click that follows would also
    // follow a link under the finger, so the click is swallowed once. Desktop menus never
    // match isSheet(), and a press inside a sheet never sets the flag.
    let outsidePress = false;
    let swallowOutside: ((click: Event) => void) | null = null;
    const disarmOutside = () => {
      if (swallowOutside) window.removeEventListener("click", swallowOutside, { capture: true });
      swallowOutside = null;
    };
    const onOutsideDown = (event: PointerEvent) => {
      if (!event.isPrimary) return;
      const open = openSheets().filter(isSheet);
      const target = event.target instanceof Node ? event.target : null;
      outsidePress = open.length > 0 && !open.some(openSheet => target !== null && openSheet.contains(target));
    };
    const onOutsideUp = () => {
      if (!outsidePress && !swallowOutside) return;
      setTimeout(() => { outsidePress = false; disarmOutside(); }, 0);
    };
    const onOutsideCancel = () => { outsidePress = false; disarmOutside(); };

    // Every close path (Back, tap outside, swipe, Close actions) starts with focus inside
    // the sheet; the popover then returns focus to where it was. Closing a sheet whose exit
    // transition runs while focus sits outside it crashed the tab in Android Chrome 133
    // (phone polish A1). No ring shows: this is programmatic focus, not keyboard focus.
    const onBeforeToggle = (event: Event) => {
      const target = event.target;
      if ((event as ToggleEvent).newState !== "closed" || !(target instanceof HTMLElement) || !target.matches("[popover]") || !isSheet(target)) return;
      animateExit(target);
      if (outsidePress && !swallowOutside) {
        const swallow = (click: Event) => { click.stopPropagation(); click.preventDefault(); disarmOutside(); };
        swallowOutside = swallow;
        window.addEventListener("click", swallow, { capture: true });
      }
      if (target.contains(document.activeElement)) return;
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    };

    // The page lock follows every popover toggle and every dialog opening or closing.
    const onToggleLock = () => requestAnimationFrame(syncPageLock);
    const dialogs = new MutationObserver(onToggleLock);
    dialogs.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open"] });
    document.addEventListener("toggle", onToggleLock, true);
    window.addEventListener("pointerdown", onOutsideDown, { capture: true, passive: true });
    window.addEventListener("pointerup", onOutsideUp, { capture: true, passive: true });
    window.addEventListener("pointercancel", onOutsideCancel, { capture: true, passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", reset);
    document.addEventListener("beforetoggle", onBeforeToggle, true);
    return () => {
      dialogs.disconnect();
      document.removeEventListener("toggle", onToggleLock, true);
      document.documentElement.removeAttribute("data-c-lock");
      disarmOutside();
      window.removeEventListener("pointerdown", onOutsideDown, { capture: true });
      window.removeEventListener("pointerup", onOutsideUp, { capture: true });
      window.removeEventListener("pointercancel", onOutsideCancel, { capture: true });
      document.removeEventListener("beforetoggle", onBeforeToggle, true);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", reset);
    };
  }, []);
  return null;
}
