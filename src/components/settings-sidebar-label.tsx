"use client";

import { useLayoutEffect, useRef, useState } from "react";

/** Keep the full destination in the accessible name when the narrow rail needs the short label. */
export function SettingsSidebarLabel({ full, short }: { full: string; short: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [compact, setCompact] = useState(false);

  useLayoutEffect(() => {
    const label = ref.current;
    const link = label?.closest("a");
    const nav = link?.closest("nav");
    const icon = link?.querySelector(".nav-icon");
    const meter = document.createElement("canvas").getContext("2d");
    if (!label || !link || !nav || !icon || !meter) return;

    const measure = () => {
      if (!link.clientWidth) return;
      const style = getComputedStyle(label);
      meter.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const textWidth = meter.measureText(full).width + (parseFloat(style.letterSpacing) || 0) * (full.length - 1);
      const row = getComputedStyle(link);
      const bounds = link.getBoundingClientRect();
      const left = row.flexDirection.startsWith("column")
        ? bounds.left + parseFloat(row.paddingLeft)
        : icon.getBoundingClientRect().right + (parseFloat(row.columnGap) || 0);
      const right = Math.min(bounds.right - parseFloat(row.paddingRight), nav.getBoundingClientRect().right);
      setCompact(textWidth > right - left);
    };
    measure();
    const observer = new ResizeObserver(measure);
    [label, link, nav].forEach(element => observer.observe(element));
    document.fonts?.addEventListener("loadingdone", measure);
    return () => {
      observer.disconnect();
      document.fonts?.removeEventListener("loadingdone", measure);
    };
  }, [full]);

  return <span ref={ref} className="nav-label">{compact ? <>{short}<span className="c-sr"> ({full})</span></> : full}</span>;
}
