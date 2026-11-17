"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Period } from "@/lib/timecards/project";
import type { readPeriodCloseHistory } from "@/lib/period-close/service";

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
  const [history, setHistory] = useState<LoadedPeriodHistory | null>(null);
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState('Load history to review all artifact and handoff events.');
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
    const pause = (event?: Event) => { if (event?.type === 'blur' && event.target !== window) return; retire('History paused. Load history again to review current access.'); };
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
  }, [retire]);
  async function load(restart: boolean) {
    if (request.current && !request.current.signal.aborted || !mounted.current) return;
    if (!navigator.onLine || document.visibilityState === 'hidden') { retire('History unavailable. Reconnect and load history again.'); return; }
    const previous = restart ? null : history;
    if (!restart && (!previous || !previous.nextCursor)) return;
    if (restart) setHistory(null);
    const abort = new AbortController(), own = ++sequence.current.value, started = performance.now();
    request.current = abort; setBusy(true); setNotice('Loading history…');
    const current = () => mounted.current && own === sequence.current.value;
    timeout.current = setTimeout(() => { if (current()) retire('History expired. Load history again.'); }, 15000);
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
      expiry.current = setTimeout(() => retire('History expired. Load history again.'), remaining);
      setHistory(next); setNotice(next.nextCursor ? 'More events are available.' : 'All events in this history snapshot are loaded.');
    } catch { if (current()) retire('History unavailable. Load history again to retry.'); }
    finally { if (current()) { if (timeout.current) clearTimeout(timeout.current); request.current = null; setBusy(false); } }
  }
  return <section aria-label="Period artifact and handoff history" aria-busy={busy}>
    <h3>Full period history</h3>
    <p role="status">{notice}</p>
    {history && <p>{history.events.length} of {history.coverage.totalEvents} events loaded. Newest first.{history.coverage.through ? ` Snapshot through ${history.coverage.through.at}.` : ''} Refresh history to include newer events.</p>}
    <button className="button secondary" type="button" disabled={busy} onClick={() => void load(true)}>{history ? 'Refresh history' : 'Load history'}</button>
    {history?.nextCursor && <button className="button secondary" type="button" disabled={busy} onClick={() => void load(false)}>Load older events</button>}
    <ol>{history?.events.map(event => <li key={event.id}>
      {event.kind.replaceAll('_', ' ')} · {event.createdAt} · actor {event.actorId}
      <details><summary>Event details</summary><p style={{ overflowWrap: 'anywhere' }}>Manifest {event.manifestId}</p>
        {([['File', 'filename'], ['Destination', 'destination'], ['Reference', 'reference'], ['Format', 'format'], ['Artifact fingerprint', 'sha256']] as const).map(([label, field]) => typeof event.payload[field] === 'string' ? <p key={field} style={{ overflowWrap: 'anywhere' }}>{label}: {String(event.payload[field])}</p> : null)}
        <p>{event.kind === 'ARTIFACT_SERVED' ? 'Server artifact response recorded. Browser file completion is unverified.' : 'Manager reported. Provider import and payroll processing remain unverified.'}</p>
      </details>
    </li>)}</ol>
  </section>;
}
