"use client";

import { useLayoutEffect, useRef, useState, type HTMLAttributes, type ReactNode, type RefObject } from "react";

/** Keeps an element at its last ready height while its content is a placeholder (loading, paused, offline,
 * failed), so nothing below it moves. With `memory`, the last ready height (a number, nothing else) is
 * remembered for this tab and width, so the next visit's placeholder starts at the right size.
 *
 * P3-ST-02/-14: the exact hold is part of the same render that swaps the content out (its `style`), not a layout
 * effect afterwards. Applied afterwards, the page had already shrunk for a moment, and the browser clamped the
 * scroll position (300 → 36), which didn't come back.
 *
 * `as` lets the held element be the card itself (a section or aside), so the card keeps its own height. */
export function HoldHeight({ holding, memory, as: Tag = "div", children, style, ...rest }: { holding: boolean; memory?: string; as?: "div" | "section" | "aside"; children?: ReactNode } & HTMLAttributes<HTMLElement>) {
  const box = useRef<HTMLElement>(null);
  const [last, setLast] = useState(0);
  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return;
    const key = memory ? `nv-hold:${memory}:${window.innerWidth}x${Math.round(parseFloat(getComputedStyle(document.documentElement).fontSize))}` : null;
    if (!holding) {
      element.style.minHeight = "";
      delete element.dataset.held;
      const measure = () => {
        const height = Math.round(element.getBoundingClientRect().height);
        setLast(height);
        if (key) try { sessionStorage.setItem(key, String(height)); } catch { /* storage unavailable: hold within this visit only */ }
      };
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(element);
      return () => observer.disconnect();
    }
    // data-held marks an exact hold (this element was ready before, in this visit); a remembered height is only an estimate.
    if (last) { element.dataset.held = "true"; return; }
    delete element.dataset.held;
    let height = 0;
    if (key) try { height = Number(sessionStorage.getItem(key)) || 0; } catch { height = 0; }
    element.style.minHeight = height ? `${height}px` : "";
  }, [holding, memory, last]);
  const held = holding && last ? { ...style, minHeight: `${last}px` } : style;
  return <Tag ref={box as RefObject<HTMLDivElement>} style={held} {...rest}>{children}</Tag>;
}

/** The ref form, for a block that can't be wrapped in `HoldHeight` (Wave A's Team availability list). It holds in a
 * layout effect, so prefer `HoldHeight` where the content swap and the scroll position matter. */
export function useHoldHeight<T extends HTMLElement>(holding: boolean, memory?: string) {
  const box = useRef<T>(null);
  const last = useRef(0);
  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return;
    const key = memory ? `nv-hold:${memory}:${window.innerWidth}x${Math.round(parseFloat(getComputedStyle(document.documentElement).fontSize))}` : null;
    if (!holding) {
      element.style.minHeight = "";
      delete element.dataset.held;
      const measure = () => {
        last.current = element.getBoundingClientRect().height;
        if (key) try { sessionStorage.setItem(key, String(Math.round(last.current))); } catch { /* storage unavailable: hold within this visit only */ }
      };
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(element);
      return () => observer.disconnect();
    }
    if (last.current) element.dataset.held = "true"; else delete element.dataset.held;
    let height = last.current;
    if (!height && key) try { height = Number(sessionStorage.getItem(key)) || 0; } catch { height = 0; }
    element.style.minHeight = height ? `${height}px` : "";
  }, [holding, memory]);
  return box;
}
