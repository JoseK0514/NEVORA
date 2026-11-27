"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BButton, BState } from "@/components/owner-b/b-kit";
import { SkeletonRows } from "@/components/skeleton";
import { CorpCard } from "@/components/corp/corp";
import type { OwnerActivityPage } from "@/lib/activity/owner-feed";
import type { PortalLang } from "@/lib/i18n/portal-lang";
import { ActivityEntries } from "./activity-entries";
import { activityCopy } from "./activity-copy";

type Cursor = string | null;
type View = (Extract<OwnerActivityPage, { state: "ready" }> & { pages: Cursor[] }) | { state: "loading" | "unavailable" | "expired" | "denied" | "offline" };
const firstPage: Cursor[] = [null];

export function ActivityFeed({ lang, timeZone }: { lang: PortalLang; timeZone: string }) {
  const t = activityCopy[lang];
  const [view, setView] = useState<View>({ state: "loading" });
  const [slow, setSlow] = useState(false);
  const request = useRef<AbortController | null>(null);
  const focusResult = useRef(false);
  const result = useRef<HTMLDivElement>(null);

  const clear = useCallback((state: "offline" | "loading") => {
    request.current?.abort();
    setSlow(false);
    setView({ state });
  }, []);

  const read = useCallback(async (pages: Cursor[], focus = false, background = false) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    focusResult.current = focus;
    if (!background) {
      setSlow(false);
      setView({ state: "loading" });
    }
    const cursor = pages.at(-1);
    const timer = setTimeout(() => { if (!controller.signal.aborted) setSlow(true); }, 2500);
    try {
      const response = await fetch("/api/owner/activity", {
        method: "POST", headers: { "Content-Type": "application/json", "x-nevora-activity": "1" },
        credentials: "same-origin", cache: "no-store", redirect: "error", signal: controller.signal,
        body: JSON.stringify(cursor == null ? {} : { limit: 25, cursor }),
      });
      if (controller.signal.aborted) return;
      const data: OwnerActivityPage | { state: "authentication_required" | "request_rejected" | "invalid_request" } = await response.json();
      if (controller.signal.aborted) return;
      if (response.status === 401 && data.state === "authentication_required") {
        setView({ state: "expired" });
        return;
      }
      if (response.status === 403 && data.state === "access_denied") {
        setView({ state: "denied" });
        return;
      }
      if (!response.ok) throw Error();
      if (data.state !== "ready" || !Array.isArray(data.entries) || !(data.nextCursor === null || typeof data.nextCursor === "string")) throw Error();
      setView({ ...data, pages });
    } catch {
      if (!controller.signal.aborted) {
        setView({ state: navigator.onLine ? "unavailable" : "offline" });
      }
    } finally {
      clearTimeout(timer);
      if (request.current === controller) request.current = null;
    }
  }, []);

  useEffect(() => {
    const pause = () => clear("loading");
    const offline = () => clear("offline");
    const refresh = () => {
      if (!navigator.onLine) offline();
      else if (document.hidden) pause();
      else void read(firstPage);
    };
    refresh();
    document.addEventListener("visibilitychange", refresh);
    for (const event of ["pagehide", "blur"]) window.addEventListener(event, pause);
    for (const event of ["pageshow", "focus", "online", "storage"]) window.addEventListener(event, refresh);
    window.addEventListener("offline", offline);
    return () => {
      request.current?.abort();
      document.removeEventListener("visibilitychange", refresh);
      for (const event of ["pagehide", "blur"]) window.removeEventListener(event, pause);
      for (const event of ["pageshow", "focus", "online", "storage"]) window.removeEventListener(event, refresh);
      window.removeEventListener("offline", offline);
    };
  }, [clear, read]);

  useEffect(() => {
    if (view.state === "loading") return;
    if (focusResult.current) {
      result.current?.focus();
      focusResult.current = false;
    }
    if (view.state !== "ready") return;
    // Recheck access even if the owner leaves the log open on the same page.
    const check = setTimeout(() => { if (!document.hidden && navigator.onLine) void read(view.pages, false, true); }, 30_000);
    return () => clearTimeout(check);
  }, [view, read]);

  const pages = view.state === "ready" ? view.pages : firstPage;
  const older = view.state === "ready" ? view.nextCursor : null;
  const newer = pages.length > 1;
  return <div className="activity-result" ref={result} tabIndex={-1} role="region" aria-label={t.events}>
    <CorpCard as="div" footer={newer || older ? <>
      {newer ? <BButton kind="quiet" onClick={() => void read(pages.slice(0, -1), true)}>{t.newer}</BButton> : null}
      {older ? <BButton kind="quiet" onClick={() => void read([...pages, older], true)}>{t.older}</BButton> : null}
    </> : undefined}>
      {view.state === "ready" ? (view.entries.length ? <ActivityEntries entries={view.entries} lang={lang} timeZone={timeZone}/> : <BState kind="empty" title={t.empty} line={t.emptyBody}/>)
        : view.state === "expired" ? <BState kind="locked" title={t.expired} action={{ href: "/login", label: t.signIn }}/>
        : view.state === "denied" ? <BState kind="locked" title={t.denied} line={t.deniedBody}/>
        : view.state === "offline" ? <BState kind="offline" title={t.offline} line={t.offlineBody}/>
        : view.state === "unavailable" ? <BState kind="failed" title={t.unavailable} action={{ label: t.retry, onClick: () => read(firstPage, true) }}/>
        : <div className="activity-loading">
            <p role="status" className="c-card__label">{slow ? t.slow : t.checking}</p>
            <SkeletonRows rows={3} variant="line" />
          </div>}
    </CorpCard>
  </div>;
}
