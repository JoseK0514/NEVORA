"use client";

import { useLayoutEffect, useRef, type HTMLAttributes, type ReactNode, type RefObject } from "react";

/** Keeps an element at its last ready height while its content is a placeholder (loading, paused, offline,
 * failed), so nothing below it moves. With `memory`, the last ready height (a number, nothing else) is
 * remembered for this tab and width, so the next visit's placeholder starts at the right size. */
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
    // data-held marks an exact hold (this element was ready before, in this visit); a remembered height is only an estimate.
    if (last.current) element.dataset.held = "true"; else delete element.dataset.held;
    let height = last.current;
    if (!height && key) try { height = Number(sessionStorage.getItem(key)) || 0; } catch { height = 0; }
    element.style.minHeight = height ? `${height}px` : "";
  }, [holding, memory]);
  return box;
}

/** `as` lets the held element be the card itself (a section or aside), so the card keeps its own height. */
export function HoldHeight({ holding, memory, as: Tag = "div", children, ...rest }: { holding: boolean; memory?: string; as?: "div" | "section" | "aside"; children?: ReactNode } & HTMLAttributes<HTMLElement>) {
  const box = useHoldHeight<HTMLElement>(holding, memory);
  return <Tag ref={box as RefObject<HTMLDivElement>} {...rest}>{children}</Tag>;
}
