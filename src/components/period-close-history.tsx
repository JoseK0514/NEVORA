"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Period } from "@/lib/timecards/project";
import type { readPeriodCloseHistory } from "@/lib/period-close/service";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { copy as periodWords } from "./payroll-period-close-copy";
import { PERIOD_CLOSE_HISTORY_COPY } from "./period-close-history-copy";

type Page = Awaited<ReturnType<typeof readPeriodCloseHistory>>;
export type LoadedPeriodHistory = { events: Page['events']; nextCursor: string | null; coverage: Page['coverage'] };

/** Refuse a broken page chain instead of hiding duplicates or claiming completeness. */
export function appendPeriodHistory(previous: LoadedPeriodHistory | null, page: Page): LoadedPeriodHistory {
  const c = page.coverage;
  if (c.kind !== 'PAGE' || c.order !== 'createdAt DESC, id DESC' || !Number.isSafeInteger(c.totalEvents) || c.totalEvents < 0 ||
      !Array.isArray(page.events) || page.events.length > 50 || c.returnedEvents !== page.events.length ||
      typeof c.hasMore !== 'boolean' || (c.hasMore ? typeof page.nextCursor !== 'string' || !page.nextCursor : page.nextCursor !== null) ||
      (previous && (previous.nextCursor === null || c.totalEvents !== previous.coverage.totalEvents || JSON.stringify(c.through) !== JSON.stringify(previous.coverage.through)))) throw Error('Invalid history page');
  const events = [...(previous?.events ?? []), ...page.events];
  if (page.events.some(e => !e || typeof e.id !== 'string' || typeof e.manifestId !== 'string' || typeof e.kind !== 'string' || typeof e.actorId !== 'string' || typeof e.createdAt !== 'string' || !e.payload || typeof e.payload !== 'object') ||
      new Set(events.map(e => e.id)).size !== events.length || events.length > c.totalEvents ||
      (c.hasMore ? page.events.length === 0 || events.length >= c.totalEvents : events.length !== c.totalEvents)) throw Error('Incomplete history page chain');
  return { events, nextCursor: page.nextCursor, coverage: c };
}

export function PeriodCloseHistory({ period, actorId }: { period: Period; actorId: string }) {
  const lang=usePortalLang(), t=PERIOD_CLOSE_HISTORY_COPY[lang];
  const eventNames: Record<string,string>={REPORTED_SUBMITTED:periodWords[lang].markedAsSent,REPORTED_IMPORTED:periodWords[lang].markedAsImported,ARTIFACT_SERVED:periodWords[lang].downloadRequested};
  const [history, setHistory] = useState<LoadedPeriodHistory | null>(null);
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState(t.loadToReview);
  const request = useRef<AbortController | null>(null), sequence = useRef({ value: 0 }), mounted = useRef(false);
  const expiry = useRef<ReturnType<typeof setTimeout> | null>(null), timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retire = useCallback((message: string) => {
    sequence.current.value++; request.current?.abort();
    if (expiry.current) clearTimeout(expiry.current);
    if (timeout.current) clearTimeout(timeout.current);
    setHistory(null); setBusy(false); setNotice(message);
  }, []);
  useEffect(() => {
    mounted.current = true;
    const lifecycle = sequence.current;
    const pause = (event?: Event) => { if (event?.type === 'blur' && event.target !== window) return; retire(t.paused); };
    const visibility = () => { if (document.visibilityState === 'hidden') pause(); };
    for (const event of ['blur', 'offline', 'pagehide']) window.addEventListener(event, pause);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      mounted.current = false; lifecycle.value++; request.current?.abort();
      if (expiry.current) clearTimeout(expiry.current);
      if (timeout.current) clearTimeout(timeout.current);
      for (const event of ['blur', 'offline', 'pagehide']) window.removeEventListener(event, pause);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [retire, t]);
  async function load(restart: boolean) {
    if (request.current && !request.current.signal.aborted || !mounted.current) return;
    if (!navigator.onLine || document.visibilityState === 'hidden') { retire(t.unavailableReconnect); return; }
    const previous = restart ? null : history;
    if (!restart && (!previous || !previous.nextCursor)) return;
    if (restart) setHistory(null);
    const abort = new AbortController(), own = ++sequence.current.value, started = performance.now();
    request.current = abort; setBusy(true); setNotice(t.loading);
    const current = () => mounted.current && own === sequence.current.value;
    timeout.current = setTimeout(() => { if (current()) retire(t.expired); }, 15000);
    try {
      const response = await fetch('/api/period-close', {
        method: 'POST', cache: 'no-store', credentials: 'same-origin', signal: abort.signal,
        headers: { 'content-type': 'application/json', 'x-nevora-period-close': '1', 'x-nevora-actor': actorId },
        body: JSON.stringify({ action: 'HISTORY', command: { ...period, limit: 50, cursor: previous?.nextCursor ?? null } }),
      });
      const body = await response.json();
      if (!current()) return;
      if (!response.ok || body.state !== 'ready' || body.result?.period?.startDate !== period.startDate || body.result?.period?.endDate !== period.endDate) throw Error('History unavailable');
      const next = appendPeriodHistory(previous, body.result), remaining = started + 15000 - performance.now();
      if (remaining <= 0) throw Error('History expired');
      if (expiry.current) clearTimeout(expiry.current);
      expiry.current = setTimeout(() => retire(t.expired), remaining);
      setHistory(next); setNotice(next.nextCursor ? t.more : t.allLoaded);
    } catch { if (current()) retire(t.unavailableRetry); }
    finally { if (current()) { if (timeout.current) clearTimeout(timeout.current); request.current = null; setBusy(false); } }
  }
  return <section aria-label={t.sectionLabel} aria-busy={busy}>
    <h3>{t.title}</h3>
    <p role="status">{notice}</p>
    {history && <p>{t.loaded(history.events.length, history.coverage.totalEvents, history.coverage.through ? history.coverage.through.at : null)}</p>}
    <button className="button secondary" type="button" disabled={busy} onClick={() => void load(true)}>{history ? t.refresh : t.load}</button>
    {history?.nextCursor && <button className="button secondary" type="button" disabled={busy} onClick={() => void load(false)}>{t.older}</button>}
    <ol>{history?.events.map(event => <li key={event.id}>
      {eventNames[event.kind] ?? event.kind.replaceAll('_', ' ')} · {event.createdAt} · {t.actor(event.actorId)}
      <details><summary>{t.details}</summary><p style={{ overflowWrap: 'anywhere' }}>{t.manifest(event.manifestId)}</p>
        {([[t.file, 'filename'], [t.destination, 'destination'], [t.reference, 'reference'], [t.format, 'format'], [t.fingerprint, 'sha256']] as const).map(([label, field]) => typeof event.payload[field] === 'string' ? <p key={field} style={{ overflowWrap: 'anywhere' }}>{label}: {String(event.payload[field])}</p> : null)}
        <p>{event.kind === 'ARTIFACT_SERVED' ? t.served : t.reported}</p>
      </details>
    </li>)}</ol>
  </section>;
}
