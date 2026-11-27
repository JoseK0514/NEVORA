"use client";

import { useLayoutEffect, useRef, useState } from "react";
import "./compact-action-label.css";

/** Keep the full wording whenever the actual control has room, including after text resizing. */
export function CompactActionLabel({ full, short, fullName }: { full: string; short: string; fullName?: string }) {
  const fullText = useRef<HTMLSpanElement>(null);
  const [compact, setCompact] = useState(false);

  useLayoutEffect(() => {
    const text = fullText.current;
    const control = text?.closest<HTMLElement>("a, button");
    if (!text || !control) return;
    const update = () => {
      if (!control.clientWidth) return;
      const style = getComputedStyle(control);
      const available = control.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      setCompact(text.getBoundingClientRect().width > available + 0.5);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(control);
    observer.observe(text);
    return () => observer.disconnect();
  }, [full]);

  return <span className="nv-compact-action">
    <span className="nv-compact-action__probe" aria-hidden="true">
      <span ref={fullText} className="nv-compact-action__measure">{full}</span>
    </span>
    <span className="nv-compact-action__text" aria-hidden={fullName ? true : undefined}>
      {compact ? <>{short}{!fullName && <span className="sr-only"> ({full})</span>}</> : full}
    </span>
    {fullName && <span className="sr-only">{compact ? `${short} (${fullName})` : fullName}</span>}
  </span>;
}
