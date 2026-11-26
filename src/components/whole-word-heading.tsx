"use client";

import { useLayoutEffect, useRef, useState } from "react";

/** Use the next heading size only when the longest word cannot fit the heading at its normal size. */
export function WholeWordHeading({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [size, setSize] = useState<"display" | "title" | null>(null);

  useLayoutEffect(() => {
    const span = ref.current;
    const heading = span?.closest("h1");
    const meter = document.createElement("canvas").getContext("2d");
    const row = heading?.parentElement;
    if (!span || !heading || !row || !meter) return;

    const measure = () => {
      if (!heading.clientWidth) return;
      const style = getComputedStyle(heading);
      // An intrinsically sized grid heading can grow wider than the row that contains it.
      const rowRight = row.getBoundingClientRect().right - parseFloat(getComputedStyle(row).paddingRight);
      const available = Math.min(heading.clientWidth, rowRight - heading.getBoundingClientRect().left)
        - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const tracking = parseFloat(style.letterSpacing) || 0;
      const words = text.split(/[ \t\r\n]+/u);
      const fits = (fontSize: string) => {
        meter.font = [style.fontStyle, style.fontWeight, fontSize, style.fontFamily].join(" ");
        return words.every(word => meter.measureText(word).width + tracking * Math.max(0, word.length - 1) <= available);
      };
      if (fits(style.fontSize)) { setSize(null); return; }
      const previous = span.style.fontSize;
      span.style.fontSize = "var(--b-fs-display)";
      const displaySize = getComputedStyle(span).fontSize;
      span.style.fontSize = previous;
      setSize(parseFloat(displaySize) < parseFloat(style.fontSize) && fits(displaySize) ? "display" : "title");
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(heading);
    observer.observe(row);
    document.fonts?.addEventListener("loadingdone", measure);
    return () => {
      observer.disconnect();
      document.fonts?.removeEventListener("loadingdone", measure);
    };
  }, [text]);

  return <span ref={ref} className={className} style={{
    hyphens: "none", wordBreak: "normal", overflowWrap: "normal",
    ...(size ? { display: "block", fontSize: `var(--b-fs-${size})`, lineHeight: `var(--b-lh-${size})` } : {}),
  }}>{text}</span>;
}
