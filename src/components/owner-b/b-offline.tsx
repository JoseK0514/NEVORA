"use client";
import { createContext, useContext, useLayoutEffect, useRef } from "react";
import { useExitValue } from "../kit/overlay-exit";

/** Jose (Nov 15, 2026, item 9; finding OW-008): while the device is offline the line sits inside the page's band, under
 * the title, as a glass pill. The shell owns the state (online, and the time the page's data was held) and passes the
 * words down; outside the shell (previews, tests) nothing renders. */
export const BOfflineContext = createContext<string | null>(null);

export function BOffline({ said = false }: { said?: boolean }) {
  const now = useContext(BOfflineContext);
  // Phase 7: back online, the pill keeps its words for its one exit (150ms, b-motion.css), marked `data-leaving`.
  const held = useExitValue(now !== null, now), line = held.value;
  const ref = useRef<HTMLParagraphElement>(null);
  // Some pages keep a band that is not drawn at this width (a phone screen on desktop). The pill marks itself only while
  // it is drawn, and the shell's own pill steps aside only for a drawn one (owner-b-shell.css), so the line always shows
  // once. A box that stops being drawn reports a size change, so the mark follows a resize too.
  // A layout effect, so the shell's pill steps aside before the first paint (no flash, one announcement).
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => element.toggleAttribute("data-shown", element.getClientRects().length > 0);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [line, said]);
  if (!line) return null;
  // The band's title already says the page is offline ("You're offline"): nothing more is drawn, and an empty marker
  // keeps the shell's pill aside, so the message is said once.
  if (said) return <span className="b-offline" data-shown="" hidden />;
  return <p ref={ref} className="b-offline b-glass" role="status" data-leaving={held.leaving ? "" : undefined}><span className="b-dot b-dot--warn" aria-hidden="true" />{line}</p>;
}
