"use client";

import { useEffect, useState } from "react";
import { announceFailure, nevoraFailure } from "@/lib/http/nevora-failure";

/** The Owner's or Manager's "needs you" count for the phone Inbox tab (F1), from GET /api/manager/inbox-count.
 * It reads only while the page is visible, clears the number when the page is hidden (private data never stays
 * on screen), and gives null whenever the count isn't confirmed, so the tab shows no badge rather than a guess. */
const absent = new Set<string>();
/** Review fix (38/50): navigations re-ran the read on every pathname change; a count under 20s old is reused. */
let cached: { at: number; value: number | null } | null = null;

export function useInboxCount(enabled: boolean, pathname: string | null): number | null {
  // Review fix (38/50): a count under 20s old seeds the state, so navigations reuse it instead of refetching.
  const [count, setCount] = useState<number | null>(() => (cached && Date.now() - cached.at < 20_000 ? cached.value : null));
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let controller: AbortController | null = null;
    // Before Codex's endpoint is merged (and on any build without it), a 404 means "no count here": stop asking for this
    // page instead of failing every minute. The tab simply shows no badge.
    const read = async () => {
      if (document.visibilityState === "hidden" || absent.has("inbox-count")) return;
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetch("/api/manager/inbox-count", { credentials: "same-origin", cache: "no-store", redirect: "error", headers: { Accept: "application/json" }, signal: controller.signal });
        if (response.status === 404) { absent.add("inbox-count"); if (active) setCount(null); return; }
        // X-Nevora-Failure: an ended session or access says so once on the page; the badge just goes away.
        if (!response.ok) announceFailure(nevoraFailure(response));
        const body: unknown = response.ok ? await response.json() : null;
        const ready = body && typeof body === "object" && (body as { state?: unknown }).state === "ready" && Number.isInteger((body as { count?: unknown }).count) && (body as { count: number }).count >= 0;
        const value = ready ? (body as { count: number }).count : null;
        cached = { at: Date.now(), value };
        if (active) setCount(value);
      } catch (error) {
        if (active && !(error instanceof DOMException && error.name === "AbortError")) setCount(null);
      }
    };
    const visibility = () => { if (document.visibilityState === "hidden") { controller?.abort(); setCount(null); } else void read(); };
    if (!(cached && Date.now() - cached.at < 20_000)) void read();
    const timer = window.setInterval(() => void read(), 60_000);
    document.addEventListener("visibilitychange", visibility);
    return () => { active = false; controller?.abort(); window.clearInterval(timer); document.removeEventListener("visibilitychange", visibility); };
  }, [enabled, pathname]);
  return enabled ? count : null;
}
