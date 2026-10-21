"use client";
import Link from "next/link";
import { focusAfterRetry } from "@/components/kit/focus-after-retry";

import { useEffect, useLayoutEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { AirplaneTiltIcon, ArrowsClockwiseIcon, CalendarXIcon, UserCheckIcon, UserMinusIcon, WarningCircleIcon } from "@phosphor-icons/react/ssr";
import { Avatar, Button, Card, CardBody, Freshness, KitLink, KitStack, PageBand, Row, Rows, Tile } from "@/components/kit/kit";
import { CLOCK_IN, presentItem } from "@/lib/action-center/present";
import { useToday } from "./manager-today";
import { useSharedHomeRead, type ActionCenterConnection } from "./manager-action-center";
import { mobileActionDetail } from "./manager-action-center";
import { withoutSetupItems } from "@/lib/action-center/setup";
import { needsYou, needsYouSentence, type NeedsYou } from "@/lib/action-center/needs-you";
import type { ActionCenter, ActionItem } from "@/lib/action-center/project";
import type { Today, TodayShift } from "@/lib/today/project";
import type { ClockMonitor } from "@/lib/time-clock";
import { useClockMonitor } from "./clean/use-clock-monitor";

/* Manager and Owner Home, rebuilt for the clean Manager app (v3, approved Oct 19; spec in
 * docs/product/specs/clean-manager/spec.md). One job: what needs me now, and how today is going.
 * Reads nothing new: the published-shift snapshot (Today) and the shared action center read.
 * The week's planning facts moved to Schedule (clean/week-summary.tsx); the team tools moved to More and the sidebar. */

export type PremiumHomeWeek = {
  weekStart: string;
  weekLabel: string;
  plannedShifts: number;
  availabilitySubmitted: number;
  availabilityEligible: number;
  /** Matches the Schedule tab: published, draft, or not started. */
  locations: { name: string; state: "published" | "draft" | "not_started" }[];
  lastPublished?: string | null;
};

export type PremiumHomeProps = {
  greeting: string;
  dateLabel: string;
  timeZone: string;
  week: PremiumHomeWeek;
  /** The Owner setup row, when it applies. */
  setup?: ReactNode;
  /** When the Owner setup card lists the setup items, they leave Planning. */
  setupHoldsItems?: boolean;
};

const clock = (iso: string, timeZone: string) => {
  try { return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(iso)); }
  catch { return ""; }
};
const workspaceDay = (iso: string, timeZone: string) => {
  try { return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso)); }
  catch { return undefined; }
};
const plural = (n: number, one: string, many: string) => `${n}\u00a0${n === 1 ? one : many}`;
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();

/** Live Home: one Today read and the shared action center read. */
export function PremiumHomeLive(props: PremiumHomeProps) {
  const { snapshot: today, refreshing, refresh } = useToday();
  const { monitor, refreshing: monitorRefreshing, paused: monitorPaused } = useClockMonitor();
  const online = useSyncExternalStore(onlineSubscribe, () => navigator.onLine, () => true);
  const shared = useSharedHomeRead();
  const read = shared?.read;
  const actions = read && read.connection === "ready" ? read.snapshot : null;
  return <PremiumHomeSurface {...props} today={today} monitor={monitor} monitorPending={monitor === null && monitorRefreshing && !monitorPaused} todayRefreshing={refreshing} onRetryToday={refresh}
    actions={actions} actionsConnection={read?.connection ?? "loading"} onRetryActions={read?.refresh}
    setupHoldsItems={props.setupHoldsItems ?? !!shared?.setup} liveReaders="today actions" offline={!online} />;
}

function onlineSubscribe(change: () => void) {
  window.addEventListener("online", change); window.addEventListener("offline", change);
  return () => { window.removeEventListener("online", change); window.removeEventListener("offline", change); };
}

export type PremiumHomeSurfaceProps = PremiumHomeProps & {
  today: Today | null;
  /** Open clock-ins (the Attendance monitor's read). Working now lists them; without it, Today's shifts stand in. */
  monitor?: ClockMonitor | null;
  /** The clock-in read is still on its way: Working now holds a row per clocked-in person, so nothing moves when it lands. */
  monitorPending?: boolean;
  todayRefreshing?: boolean;
  onRetryToday?: () => void;
  actions: ActionCenter | null;
  actionsConnection: ActionCenterConnection;
  onRetryActions?: () => void;
  /** Names the private readers behind a live Home; the preview has none. */
  liveReaders?: string;
  offline?: boolean;
};

/** Presentation only, so the fictional preview can show Home without a session. */
export function PremiumHomeSurface({ dateLabel, timeZone, setup, setupHoldsItems = false, today, monitor = null, monitorPending = false, todayRefreshing = false, onRetryToday,
  actions, actionsConnection, onRetryActions, liveReaders, offline = false }: PremiumHomeSurfaceProps) {
  const readyToday = today?.state === "ready" ? today : null;
  // r4 QA: Home remembers whether the Owner setup card shows, so the next route placeholder starts with its shape.
  const hasSetup = !!setup;
  useEffect(() => { try { sessionStorage.setItem("cm-home-setup", hasSetup ? "1" : "0"); } catch { /* storage off: the placeholder keeps its default shape */ } }, [hasSetup]);
  const readyActions = actions?.state === "ready" ? (setupHoldsItems ? withoutSetupItems(actions).snapshot : actions) : null;
  const items = readyActions?.state === "ready" ? readyActions.items : [];
  const day = readyActions?.state === "ready" ? workspaceDay(readyActions.observedAt, timeZone) : undefined;
  const todayFailed = today?.state === "unavailable";
  const value = readyActions && (readyToday || todayFailed) ? needsYou(items, day, readyToday?.missed ?? []) : null;
  const retryAll = () => { onRetryActions?.(); onRetryToday?.(); focusAfterRetry("#home-needs-you .nv-card__title", ".premium-pending-failed .nv-btn"); };
  // The band's one live line. Once Home has numbers the Needs you card says them, so the line is for screen readers only.
  const summary = value ? needsYouSentence(value.count)
    : actionsConnection === "offline" ? "You’re offline."
    : actionsConnection === "paused" ? "Paused while you’re away."
    : actionsConnection === "unavailable" || actionsConnection === "access_lost" || today?.state === "unavailable" ? "Couldn’t load everything."
    : "Checking what needs you…";

  // WR-64 / ST-28: once Home has shown what needs you, a pause, an offline spell or a failed refresh keeps the Needs you
  // column at its last height, so nothing below moves.
  const nowColumn = useRef<HTMLDivElement>(null);
  const last = useRef({ column: 0, ready: false });
  const holding = !value;
  useLayoutEffect(() => {
    const column = nowColumn.current;
    if (!column) return;
    if (value) {
      column.style.height = "";
      delete column.dataset.holding;
      const measure = () => {
        if (column.querySelector(".premium-skeleton-card")) return;
        last.current = { ready: true, column: column.getBoundingClientRect().height };
      };
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(column);
      return () => observer.disconnect();
    }
    const hold = holding && last.current.ready;
    column.style.height = hold ? `${last.current.column}px` : "";
    if (hold) column.dataset.holding = ""; else delete column.dataset.holding;
  }, [value, holding, actionsConnection, offline]);

  return <div className="nv-page premium-home cm-page cm-home" data-nv-page="" data-live-readers={liveReaders}>
    {/* The one live line is for screen readers in every state; each card says its own state, so the header never changes height. */}
    <PageBand eyebrow={dateLabel} title="Today" summary={<span role="status" className="sr-only">{summary}</span>} />
    <KitStack className="cm-home__grid">
      {setup ? <div className="cm-home__setup">{setup}</div> : null}
      <div className="cm-home__now" ref={nowColumn}>
        {value ? <NeedsYouCard value={value} timeZone={timeZone} /> : <PendingCard connection={offline ? "offline" : actionsConnection} onRetry={retryAll} />}
      </div>
      <div className="cm-home__people">
        <PeopleCards today={today} monitor={monitor} monitorPending={monitorPending} refreshing={todayRefreshing} onRetry={onRetryToday} timeZone={timeZone} offline={offline} paused={actionsConnection === "paused"} />
      </div>
      {readyToday && readyToday.shifts.length ? <div className="cm-home__timeline"><ShiftTimeline today={readyToday} monitor={monitor} timeZone={timeZone} /></div> : null}
    </KitStack>
  </div>;
}

const locationCounts = (list: { locationName?: string | null }[]) => {
  const counts = new Map<string, number>();
  for (const entry of list) if (entry.locationName) counts.set(entry.locationName, (counts.get(entry.locationName) ?? 0) + 1);
  return [...counts].map(([name, n]) => `${name} ${n}`).join(" · ");
};

/** Needs you: one row per kind, each with its count, each opening the matching Inbox view. */
function NeedsYouCard({ value, timeZone }: { value: NeedsYou; timeZone: string }) {
  if (value.count === 0) return <Card id="home-needs-you" title="Needs you">
    <CardBody><p className="premium-note">Nothing needs you right now. New requests and shifts with no clock‑in show up here.</p></CardBody>
  </Card>;
  const gaps = value.now.filter(item => item.type === "COVERAGE_GAP");
  const urgentRequests = value.now.filter(item => item.category === "requests");
  const otherUrgent = value.now.filter(item => item.type !== "COVERAGE_GAP" && item.category !== "requests");
  const requests = [...urgentRequests, ...value.requests];
  const person = (item: ActionItem) => presentItem({ ...item, detail: mobileActionDetail(item.detail) }, "", timeZone).person;
  const oneRequest = requests.length === 1 ? requests[0] : null;
  const requestMeta = oneRequest ? [person(oneRequest), oneRequest.type === "TIME_OFF" ? "time off" : oneRequest.type === "EXCHANGE" ? "shift change" : "can’t work"].filter(Boolean).join(", ") : undefined;
  const gapPlaces = gaps.map(item => ({ locationName: gapLocation(item) }));
  return <Card id="home-needs-you" title={<>Needs you<span className="cm-count">{value.count}</span></>} titleLabel={`Needs you, ${value.count}`}
    meta={<KitLink href="/app/inbox">Inbox</KitLink>} foot={<span className="cm-desk-only"><KitLink href="/app/inbox">Open Inbox</KitLink></span>}>
    <Rows label="Needs you">
      {value.noClockIn.length ? <Row href="/app/inbox?filter=now" leading={<Tile tone="urgent"><UserMinusIcon size={20} weight="fill" /></Tile>}
        title={`Not clocked in`} meta={locationCounts(value.noClockIn) || undefined} trailing={<span className="cm-row-count">{value.noClockIn.length}</span>}
        label={`${plural(value.noClockIn.length, `shift with no ${CLOCK_IN}`, `shifts with no ${CLOCK_IN}`).replace("\u00a0", " ")}, open in Inbox`} /> : null}
      {gaps.length ? <Row href="/app/inbox?filter=now" leading={<Tile tone="review"><CalendarXIcon size={20} weight="fill" /></Tile>}
        title="Open shifts today" meta={locationCounts(gapPlaces) || undefined} trailing={<span className="cm-row-count">{gaps.length}</span>}
        label={`${plural(gaps.length, "open shift", "open shifts").replace("\u00a0", " ")} today, open in Inbox`} /> : null}
      {otherUrgent.length ? <Row href="/app/inbox?filter=now" leading={<Tile tone="urgent"><WarningCircleIcon size={20} weight="fill" /></Tile>}
        title="Urgent" trailing={<span className="cm-row-count">{otherUrgent.length}</span>}
        label={`${plural(otherUrgent.length, "urgent item", "urgent items").replace("\u00a0", " ")}, open in Inbox`} /> : null}
      {requests.length ? <Row href="/app/inbox?filter=requests" leading={<Tile tone="neutral">{oneRequest?.type === "TIME_OFF" ? <AirplaneTiltIcon size={20} weight="fill" /> : <UserCheckIcon size={20} weight="fill" />}</Tile>}
        title={oneRequest ? (oneRequest.type === "TIME_OFF" ? "Time-off request" : oneRequest.type === "EXCHANGE" ? "Shift change request" : "Can’t-work report") : "Requests"} meta={requestMeta} trailing={<span className="cm-row-count">{requests.length}</span>}
        label={`${plural(requests.length, "request", "requests").replace("\u00a0", " ")} waiting, open in Inbox`} /> : null}
    </Rows>
  </Card>;
}

/** The coverage gap's place, from its detail ("Main Office · …") when the item carries no location name. */
function gapLocation(item: ActionItem) {
  const fromTitle = /\bat (.+)$/.exec(item.title)?.[1];
  return fromTitle ?? item.detail.split(" · ")[0] ?? null;
}

/** "2 PM", "5:30 PM": whole hours lose their ":00", as in the mockups. */
const short = (iso: string, timeZone: string) => clock(iso, timeZone).replace(":00", "");

const working = (shift: TodayShift) => shift.status === "clocked_in" || shift.status === "on_break";
const later = (shift: TodayShift) => shift.status === "upcoming" || shift.status === "starting";

/** Who is working now and who starts later today, from the published-shift snapshot. */
function PeopleCards({ today, monitor, monitorPending = false, refreshing, onRetry, timeZone, offline = false, paused = false }: { today: Today | null; monitor: ClockMonitor | null; monitorPending?: boolean; refreshing: boolean; onRetry?: () => void; timeZone: string; offline?: boolean; paused?: boolean }) {
  if (!today || today.state !== "ready") {
    const stamp = !today && offline ? <Freshness state="offline">Offline</Freshness> : !today && paused ? <Freshness state="stale">Paused</Freshness>
      : !today ? <span className="cm-loading-meta"><Freshness state="stale">Loading…</Freshness></span>
      : <button type="button" className="premium-today-retry" aria-disabled={refreshing || undefined}
          onClick={() => { if (refreshing || !onRetry) return; onRetry(); focusAfterRetry("#home-working .nv-card__title", ".premium-today-retry"); }}>
          <ArrowsClockwiseIcon size={16} aria-hidden="true" />{refreshing ? "Trying…" : "Try again"}
        </button>;
    return <Card id="home-working" title="Working now" meta={stamp} foot={today?.state === "unavailable" ? "Today’s clock-ins aren’t available." : undefined}>
      <div className="premium-skeleton premium-skeleton--rows premium-skeleton--still" aria-hidden="true">{[0, 1].map(i => <span key={i} className="premium-skeleton__row"><span className="premium-skeleton__dot" /><span><span className="premium-skeleton__line" /><span className="premium-skeleton__line premium-skeleton__line--short" /></span></span>)}</div>
    </Card>;
  }
  // Who is on the clock: the open clock-ins when that read is in, else today's shifts that show a clock-in.
  const open = monitor?.state === "ready" ? [...monitor.employees].sort((a, b) => a.clockInAt.localeCompare(b.clockInAt)) : null;
  const shiftFor = (employeeId: string) => today.shifts.find(shift => shift.employeeId === employeeId && working(shift));
  const now = today.shifts.filter(working);
  const count = open ? open.length : now.length || today.counts.clockedIn;
  const next = today.shifts.filter(later).sort((a, b) => a.startAt.localeCompare(b.startAt));
  return <>
    <Card id="home-working" title={<>Working now<span className="cm-count">{count}</span></>}
      foot={<Freshness>Updated <time dateTime={today.observedAt}>{clock(today.observedAt, timeZone)}</time></Freshness>}>
      {!open && monitorPending && today.counts.clockedIn ? <div className="premium-skeleton premium-skeleton--rows cm-working-hold" aria-hidden="true">
        {Array.from({ length: Math.min(today.counts.clockedIn, 6) }, (_, i) => <span key={i} className="premium-skeleton__row"><span className="premium-skeleton__dot" /><span><span className="premium-skeleton__line" /><span className="premium-skeleton__line premium-skeleton__line--short" /></span></span>)}
      </div> : open && open.length ? <Rows label="Working now">
        {open.map(person => { const shift = shiftFor(person.employeeId); return <Row key={person.timeEntryId}
          leading={<Avatar initials={initials(person.employeeName)} />} title={person.employeeName}
          meta={`${person.locationName}\u00a0· ${person.state === "ON_BREAK" ? "on break" : `in at ${clock(person.clockInAt, timeZone)}`}`}
          trailing={shift ? `until ${short(shift.endAt, timeZone)}` : undefined} />; })}
      </Rows> : now.length ? <Rows label="Working now">
        {now.map(shift => <Row key={shift.id}
          leading={<Avatar initials={initials(shift.employeeName)} />} title={shift.employeeName}
          meta={`${shift.locationName}\u00a0· ${shift.status === "on_break" ? "on break" : shift.firstClockInAt ? `in at ${clock(shift.firstClockInAt, timeZone)}` : "clocked in"}`}
          trailing={`until ${short(shift.endAt, timeZone)}`} />)}
      </Rows> : <CardBody><p className="premium-note">{!open && today.counts.clockedIn
        // A snapshot can carry counts without its shift list; the count is still true.
        ? `${plural(today.counts.clockedIn, "person is", "people are")} clocked in.` : "No one is clocked in right now."}</p></CardBody>}
    </Card>
    {next.length ? <Card id="home-later" title={<>Later today<span className="cm-count">{next.length}</span></>}>
      <Rows label="Later today">
        {next.slice(0, 4).map(shift => <Row key={shift.id}
          leading={<Avatar initials={initials(shift.employeeName)} />} title={shift.employeeName} meta={shift.locationName}
          trailing={`${short(shift.startAt, timeZone)} – ${short(shift.endAt, timeZone)}`} />)}
        {/* Final re-pass P3: the count says 6, so the rest are one step away. */}
        {next.length > 4 ? <li className="cm-later-more"><Link className="nv-row" href="/app/schedule">{`Show ${next.length - 4} more`}</Link></li> : null}
      </Rows>
    </Card> : null}
  </>;
}

/** One timeline row: the planned shift (if any) and the time recorded so far (if any), in epoch milliseconds. */
export type TimelineLane = {
  key: string; name: string; planned: { from: number; to: number } | null; recorded: { from: number; to: number } | null;
  /** in: on the clock now · done: clocked in and finished · later: starts later · missed: no clock-in · unscheduled: on the clock with no shift today. */
  kind: "in" | "done" | "later" | "missed" | "unscheduled"; clockedInAt: string | null; shift: TodayShift | null;
};

/** UI-1 / PD2 / UX6: the day as planned and as recorded. Someone the clock-in read lists as working is never drawn as
 * "No clock-in", even when they clocked in outside their planned hours; their recorded time runs from the clock-in to now.
 * People on the clock with no shift today get their own row. The axis always includes now. */
export function timelineLanes(today: Extract<Today, { state: "ready" }>, monitor: ClockMonitor | null) {
  const now = Date.parse(today.observedAt);
  const open = new Map((monitor?.state === "ready" ? monitor.employees : []).map(person => [person.employeeId, person]));
  const lanes: TimelineLane[] = [...today.shifts].sort((a, b) => a.startAt.localeCompare(b.startAt)).map(shift => {
    const planned = { from: Date.parse(shift.startAt), to: Date.parse(shift.endAt) };
    const clock = open.get(shift.employeeId);
    const clockedInAt = working(shift) ? shift.firstClockInAt ?? clock?.clockInAt ?? null : clock?.clockInAt ?? null;
    const recorded = clockedInAt && (working(shift) || clock) ? { from: Math.min(Date.parse(clockedInAt), now), to: now } : null;
    const kind: TimelineLane["kind"] = working(shift) || clock ? "in" : shift.status === "done" ? "done" : later(shift) ? "later" : "missed";
    return { key: shift.id, name: shift.employeeName, planned, recorded, kind, clockedInAt: kind === "done" ? shift.firstClockInAt : clockedInAt, shift };
  });
  const scheduled = new Set(today.shifts.map(shift => shift.employeeId));
  for (const person of open.values()) if (!scheduled.has(person.employeeId)) lanes.push({ key: `open:${person.timeEntryId}`, name: person.employeeName, planned: null,
    recorded: { from: Math.min(Date.parse(person.clockInAt), now), to: now }, kind: "unscheduled", clockedInAt: person.clockInAt, shift: null });
  const hour = 3_600_000;
  const times = lanes.flatMap(lane => [lane.planned?.from, lane.planned?.to, lane.recorded?.from]).filter((time): time is number => Number.isFinite(time));
  // From the earliest start or clock-in (or now) to the latest end, or the hour after now, whichever is later.
  const from = Math.floor(Math.min(now, ...times) / hour) * hour;
  const to = Math.max(Math.ceil(Math.max(...times, now) / hour) * hour, Math.floor(now / hour) * hour + hour);
  return { lanes, from, to, now };
}

/** Desktop only: today's shifts on one timeline. Bars are decoration; each row's name and times are text. */
function ShiftTimeline({ today, monitor, timeZone }: { today: Extract<Today, { state: "ready" }>; monitor: ClockMonitor | null; timeZone: string }) {
  const { lanes, from, to, now } = timelineLanes(today, monitor);
  const hour = 3_600_000;
  const span = Math.max(to - from, hour);
  const at = (time: number) => `${(((time - from) / span) * 100).toFixed(2)}%`;
  const width = (range: { from: number; to: number }) => `calc(${at(range.to)} - ${at(range.from)})`;
  // Whole-hour ticks, at most about seven of them.
  const step = Math.max(1, Math.ceil(span / hour / 6)) * hour;
  const ticks = Array.from({ length: Math.floor(span / step) + 1 }, (_, i) => from + step * i);
  const said = (lane: TimelineLane) => {
    const planned = lane.shift ? `, ${clock(lane.shift.startAt, timeZone)} to ${clock(lane.shift.endAt, timeZone)}` : ", no shift today";
    const state = lane.kind === "in" || lane.kind === "unscheduled" ? (lane.clockedInAt ? `, clocked in at ${clock(lane.clockedInAt, timeZone)}` : ", clocked in")
      : lane.kind === "done" ? ", clocked in" : lane.kind === "later" ? ", later today" : `, no ${CLOCK_IN}`;
    return planned + state;
  };
  const recording = lanes.some(lane => lane.recorded);
  return <Card id="home-timeline" title="Shifts today" meta={<span className="cm-count">{today.shifts.length}</span>}>
    <div className="cm-timeline">
      <div className="cm-timeline__axis" aria-hidden="true"><span />
        <span className="cm-timeline__track">{ticks.map((tick, i) => <span key={i} style={{ left: at(tick) }}>{clock(new Date(tick).toISOString(), timeZone).replace(":00", "")}</span>)}</span>
      </div>
      <ul className="cm-timeline__rows" aria-label="Shifts today">
        {lanes.map(lane => <li key={lane.key} className="cm-timeline__row">
          <span className="cm-timeline__name">{lane.name}<span className="sr-only">{said(lane)}</span></span>
          <span className="cm-timeline__track" aria-hidden="true">
            {ticks.map((tick, i) => <i key={i} className="cm-timeline__grid" style={{ left: at(tick) }} />)}
            {lane.planned ? <i className="cm-timeline__bar" data-kind={lane.kind === "in" ? "planned" : lane.kind === "done" ? "in" : lane.kind} style={{ left: at(lane.planned.from), width: width(lane.planned) }} /> : null}
            {lane.recorded ? <i className="cm-timeline__bar" data-kind="recorded" style={{ left: at(lane.recorded.from), width: width(lane.recorded) }} /> : null}
            <i className="cm-timeline__now" style={{ left: at(now) }} />
          </span>
        </li>)}
      </ul>
      <p className="cm-timeline__key" aria-hidden="true"><span data-kind="in">Clocked in</span>{recording ? <span data-kind="planned">Planned</span> : null}<span data-kind="missed">No {CLOCK_IN}</span><span data-kind="later">Later today</span><span data-kind="now">Now, {clock(today.observedAt, timeZone)}</span></p>
    </div>
  </Card>;
}

function PendingCard({ connection, onRetry }: { connection: ActionCenterConnection; onRetry?: () => void }) {
  const busy = connection === "loading" || connection === "reconnecting";
  // ST-01: while loading, hold the space the Needs you rows will take.
  const rows = <div className={`premium-skeleton premium-skeleton--rows${busy ? "" : " premium-skeleton--still"}`} aria-hidden="true">{[0, 1, 2].map(i => <span key={i} className="premium-skeleton__row"><span className="premium-skeleton__dot" /><span><span className="premium-skeleton__line" /><span className="premium-skeleton__line premium-skeleton__line--short" /></span></span>)}</div>;
  if (busy) return <section className="nv-card premium-skeleton-card" id="home-needs-you" aria-label="Needs you" aria-busy="true">
    <div className="nv-card__head"><h2 className="nv-card__title">Needs you</h2><span className="nv-card__meta cm-loading-meta"><Freshness state="stale">Loading…</Freshness></span></div>
    {rows}
  </section>;
  const message = connection === "offline" ? "Updates when you reconnect." : connection === "paused" ? "Updates when you’re back."
    : connection === "access_lost" ? "Sign in again to see what needs you." : "What needs you isn’t available right now.";
  return <section className="nv-card premium-skeleton-card premium-pending-failed" id="home-needs-you" aria-label="Needs you">
    <div className="nv-card__head"><h2 className="nv-card__title">Needs you</h2><span className="nv-card__meta"><Freshness state={connection === "offline" ? "offline" : "stale"}>{connection === "offline" ? "Offline" : connection === "paused" ? "Paused" : "Not available"}</Freshness></span></div>
    {/* IS-54: the band summary is the one live region; this message is read in place. */}
    <div className="nv-card__body"><p className="premium-note">{message}</p>
      {connection === "access_lost" ? <Button href="/login" kind="secondary">Sign in</Button>
        : onRetry && connection !== "offline" && connection !== "paused" ? <button type="button" className="nv-btn" data-kind="secondary" onClick={onRetry}><ArrowsClockwiseIcon size={18} aria-hidden="true" />Try again</button> : null}
    </div>
  </section>;
}
