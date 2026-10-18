"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowsClockwiseIcon, CalendarCheckIcon, ClockIcon, HourglassMediumIcon, WarningCircleIcon } from "@phosphor-icons/react/ssr";
import { createPrivateSnapshotController } from "@/lib/private-snapshot-client";
import { parseToday, STATUS_TEXT, START_GRACE_MINUTES, type Today, type TodayShift } from "@/lib/today/project";

/** Today on the floor (B4): Home tiles and the Inbox's missed punches share one
 * read-only snapshot of published shifts against recorded punches. */
export function useToday() {
  const [snapshot, setSnapshot] = useState<Today | null>(null);
  const [refreshing, setRefreshing] = useState(true);
  const controller = useRef<ReturnType<typeof createPrivateSnapshotController<Today>> | null>(null);
  useEffect(() => {
    const c = createPrivateSnapshotController<Today>(value => { setRefreshing(value.refreshing); if (!value.refreshing) setSnapshot(value.snapshot); }, async signal => {
      const response = await fetch("/api/manager/today", { method: "GET", credentials: "same-origin", cache: "no-store", signal, headers: { "X-Nevora-Today": "1" } });
      if (response.status === 401 || response.status === 403) return { state: "unavailable", reason: "access_denied" };
      if (!response.ok) throw Error("Unavailable");
      return response.json();
    }, parseToday, reason => ({ state: "unavailable", reason }), () => "read_failed");
    controller.current = c;
    const sync = () => { if (document.visibilityState === "visible" && navigator.onLine) c.start(); else c.pause(); };
    sync();
    document.addEventListener("visibilitychange", sync); window.addEventListener("online", sync); window.addEventListener("offline", sync);
    return () => { c.stop(); controller.current = null; document.removeEventListener("visibilitychange", sync); window.removeEventListener("online", sync); window.removeEventListener("offline", sync); };
  }, []);
  return { snapshot, refreshing, refresh: () => controller.current?.refresh() };
}

const time = (iso: string, timeZone: string) => new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(iso));

export function ManagerTodayTiles() {
  const { snapshot, refreshing, refresh } = useToday();
  return <TodayTilesSurface snapshot={snapshot} refreshing={refreshing} onRetry={refresh} />;
}

/** Presentational, so the fictional Home preview can show tiles without a session. */
export function TodayTilesSurface({ snapshot, refreshing = false, onRetry }: { snapshot: Today | null; refreshing?: boolean; onRetry?: () => void }) {
  if (!snapshot) return <section className="today-tiles" aria-label="Today" aria-busy="true">
    {[0, 1, 2, 3].map(i => <div key={i} className="today-tile today-tile-loading" aria-hidden="true"><span /><strong /></div>)}
    <span className="sr-only" role="status">Loading today</span>
  </section>;
  if (snapshot.state !== "ready") return <section className="today-tiles today-tiles-unavailable" aria-label="Today">
    <p role="status">Today&rsquo;s numbers aren&rsquo;t available right now.</p>
    <button type="button" className="button secondary" onClick={onRetry} disabled={refreshing}><ArrowsClockwiseIcon size={18} aria-hidden="true" />Try again</button>
  </section>;
  const { counts, timeZone, observedAt } = snapshot;
  const tiles = [
    { id: "scheduled", label: "Scheduled today", value: counts.scheduled, Icon: CalendarCheckIcon, href: "/app/schedule" },
    { id: "clocked-in", label: "Clocked in now", value: counts.clockedIn, Icon: ClockIcon, href: "/app?view=attendance" },
    { id: "late", label: "Clocked in after start", value: counts.late, Icon: HourglassMediumIcon, href: "/app?view=attendance" },
    { id: "not-clocked-in", label: "Started, not clocked in", value: counts.notClockedIn, Icon: WarningCircleIcon, href: "/app/inbox#missed-punches", urgent: counts.notClockedIn > 0 },
  ];
  return <section className="today-tiles" aria-labelledby="today-tiles-title">
    <h2 id="today-tiles-title" className="sr-only">Today</h2>
    {tiles.map(({ id, label, value, Icon, href, urgent }) => <Link key={id} href={href} className="today-tile" data-tile={id} data-urgent={urgent || undefined} data-zero={value === 0 || undefined}>
      <span className="today-tile-label"><Icon size={18} aria-hidden="true" />{label}</span>
      <strong>{value}</strong>
    </Link>)}
    <p className="today-tiles-note">Published shifts only · Updated <time dateTime={observedAt}>{time(observedAt, timeZone)}</time></p>
  </section>;
}

function MissedRow({ shift, timeZone }: { shift: TodayShift; timeZone: string }) {
  const running = shift.status === "not_clocked_in";
  return <li className="missed-row" data-status={shift.status}>
    <div className="missed-row-copy">
      <strong>{shift.employeeName}</strong>
      <span>{STATUS_TEXT[shift.status]} · {running ? `started ${time(shift.startAt, timeZone)}` : `${time(shift.startAt, timeZone)}–${time(shift.endAt, timeZone)}`} · {shift.locationName}</span>
    </div>
    <Link className="missed-row-action" href={running ? `/app/employees/${encodeURIComponent(shift.employeeId)}` : `/app/timecards#timecard-${encodeURIComponent(shift.employeeId)}`}>
      {running ? "Contact" : "Review timecard"} <span aria-hidden="true">›</span><span className="sr-only"> for {shift.employeeName}</span>
    </Link>
  </li>;
}

/** Top of the Inbox. Hidden when nothing is missed, so a calm day stays calm. */
export function MissedPunches() {
  const { snapshot } = useToday();
  if (!snapshot || snapshot.state !== "ready" || !snapshot.missed.length) return null;
  const running = snapshot.missed.filter(s => s.status === "not_clocked_in"), ended = snapshot.missed.filter(s => s.status === "no_punches");
  return <section className="missed-punches" id="missed-punches" aria-labelledby="missed-punches-title">
    <div className="missed-punches-head">
      <h2 id="missed-punches-title">Missed punches <span className="missed-count">{snapshot.missed.length}</span></h2>
      <p>Published shifts today with no clock-in recorded. Started means more than {START_GRACE_MINUTES} minutes ago.</p>
    </div>
    {running.length ? <ul aria-label="Started, not clocked in">{running.map(s => <MissedRow key={s.id} shift={s} timeZone={snapshot.timeZone} />)}</ul> : null}
    {ended.length ? <ul aria-label="No punches recorded">{ended.map(s => <MissedRow key={s.id} shift={s} timeZone={snapshot.timeZone} />)}</ul> : null}
  </section>;
}
