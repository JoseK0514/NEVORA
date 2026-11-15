"use client";
import { createContext, useContext, useEffect, useRef } from "react";

/** Jose (Nov 15, 2026, item 9; finding OW-008): while the device is offline the line sits inside the page's band, under
 * the title, as a glass pill. The shell owns the state (online, and the time the page's data was held) and passes the
 * words down; outside the shell (previews, tests) nothing renders. */
export const BOfflineContext = createContext<string | null>(null);

export function BOffline() {
  const line = useContext(BOfflineContext);
  const ref = useRef<HTMLParagraphElement>(null);
  // Some pages keep a band that is not drawn at this width (a phone screen on desktop). The pill marks itself only while
  // it is drawn, and the shell's own pill steps aside only for a drawn one (owner-b-shell.css), so the line always shows
  // once. A box that stops being drawn reports a size change, so the mark follows a resize too.
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => element.toggleAttribute("data-shown", element.getClientRects().length > 0);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [line]);
  if (!line) return null;
  return <p ref={ref} className="b-offline b-glass" role="status"><span className="b-dot b-dot--warn" aria-hidden="true" />{line}</p>;
}
