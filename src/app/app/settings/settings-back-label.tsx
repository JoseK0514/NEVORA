"use client";

import { useLayoutEffect, useRef, useState } from "react";

/** The full destination stays measurable when the narrow header uses its shorter label. */
export function SettingsBackLabel({ destination, compactLabel }: { destination: string; compactLabel: string }) {
  const full = useRef<HTMLSpanElement>(null);
  const [compact, setCompact] = useState(false);

  useLayoutEffect(() => {
    const label = full.current;
    const nav = label?.closest(".c-nav");
    const action = nav?.querySelector<HTMLButtonElement>(".c-nav__right button");
    if (!label || !nav) return;

    const measure = () => {
      if (!nav.getClientRects().length) { setCompact(false); return; }
      const right = action?.getClientRects().length ? action.getBoundingClientRect().left
        : Math.min(nav.getBoundingClientRect().right, document.documentElement.clientWidth) - parseFloat(getComputedStyle(nav).paddingRight);
      setCompact(label.getBoundingClientRect().right > right);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    observer.observe(label);
    if (action) observer.observe(action);
    return () => observer.disconnect();
  }, [destination]);

  return <span className="settings-back-label" data-compact={compact || undefined}>
    <span className="settings-back-label__full" ref={full}>{destination}</span>
    {compact && <span>{compactLabel}</span>}
  </span>;
}
