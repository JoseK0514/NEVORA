"use client";

import { useEffect, useState } from "react";

/** The Owner's or Manager's "needs you" count for the phone Inbox tab (F1), from GET /api/manager/inbox-count.
 * It reads only while the page is visible, clears the number when the page is hidden (private data never stays
 * on screen), and gives null whenever the count isn't confirmed, so the tab shows no badge rather than a guess. */
export function useInboxCount(enabled: boolean, pathname: string | null): number | null {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let controller: AbortController | null = null;
    const read = async () => {
      if (document.visibilityState === "hidden") return;
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetch("/api/manager/inbox-count", { credentials: "same-origin", cache: "no-store", redirect: "error", headers: { Accept: "application/json" }, signal: controller.signal });
        const body: unknown = response.ok ? await response.json() : null;
        const ready = body && typeof body === "object" && (body as { state?: unknown }).state === "ready" && Number.isInteger((body as { count?: unknown }).count) && (body as { count: number }).count >= 0;
        if (active) setCount(ready ? (body as { count: number }).count : null);
      } catch (error) {
        if (active && !(error instanceof DOMException && error.name === "AbortError")) setCount(null);
      }
    };
    const visibility = () => { if (document.visibilityState === "hidden") { controller?.abort(); setCount(null); } else void read(); };
    void read();
    const timer = window.setInterval(() => void read(), 60_000);
    document.addEventListener("visibilitychange", visibility);
    return () => { active = false; controller?.abort(); window.clearInterval(timer); document.removeEventListener("visibilitychange", visibility); };
  }, [enabled, pathname]);
  return enabled ? count : null;
}
