"use client";

import { useEffect } from "react";

/** Phone sheets (popovers styled with --sheet: 1) can be swiped down to close.
 * Direct manipulation per Apple's fluid-interface guidance and Emil Kowalski's
 * drawer rules: the sheet follows the finger 1:1 from where it was grabbed,
 * resists upward drags, and a quick flick closes it as well as distance does.
 * Only transforms are written; CSS owns the open/close transitions, so a
 * release continues from the sheet's live position. */
const SHEET_SELECTOR = "[popover]:popover-open";
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
      const target = event.target instanceof Element ? event.target.closest(SHEET_SELECTOR) : null;
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
        current.style.transform = "";
        current.hidePopover();
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
      const open = Array.from(document.querySelectorAll(SHEET_SELECTOR)).filter(isSheet);
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
      if (outsidePress && !swallowOutside) {
        const swallow = (click: Event) => { click.stopPropagation(); click.preventDefault(); disarmOutside(); };
        swallowOutside = swallow;
        window.addEventListener("click", swallow, { capture: true });
      }
      if (target.contains(document.activeElement)) return;
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    };

    window.addEventListener("pointerdown", onOutsideDown, { capture: true, passive: true });
    window.addEventListener("pointerup", onOutsideUp, { capture: true, passive: true });
    window.addEventListener("pointercancel", onOutsideCancel, { capture: true, passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", reset);
    document.addEventListener("beforetoggle", onBeforeToggle, true);
    return () => {
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
