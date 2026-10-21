'use client';

import { useLayoutEffect, useRef } from 'react';

/* The Clocker's state change: the panel settles 6px up and from .55 opacity over 240ms. Built on
 * the browser's own Web Animations API (no animation library), on mount and on every state change, as the GSAP
 * version did; nothing moves under prefers-reduced-motion. */
const DURATION = 240;
const EASE = 'cubic-bezier(.2, .7, .2, 1)';

export function useClockerMotion(state: string) {
  const scope = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = scope.current;
    if (!element || typeof element.animate !== 'function') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const animation = element.animate(
      [{ transform: 'translateY(6px)', opacity: .55 }, { transform: 'none', opacity: 1 }],
      { duration: DURATION, easing: EASE },
    );
    return () => animation.cancel();
  }, [state]);
  return scope;
}
