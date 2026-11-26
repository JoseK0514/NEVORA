"use client";
import type { HomePayrollStatus } from '@/lib/payroll/backlog-read';

import { focusAfterRetry } from "@/components/kit/focus-after-retry";

import { useEffect, useLayoutEffect, useRef, useSyncExternalStore, type ReactNode } from "react";


import { QuietBar, QuietBarIcon, QuietHeader, QuietList, QuietRow, QuietSection } from "@/components/quiet/quiet";
import { BellIcon } from "@phosphor-icons/react/dist/ssr/Bell";
import { ATTENDANCE_WORDS, CLOCK_IN, presentItem } from "@/lib/action-center/present";
import { useToday } from "./manager-today";
import { useSharedHomeRead, type ActionCenterConnection } from "./manager-action-center";
import { mobileActionDetail } from "./manager-action-center";
import { withoutSetupItems } from "@/lib/action-center/setup";
import { workspaceNow } from "@/lib/action-center/inbox";
import { needsYou, needsYouSentence, type NeedsYou } from "@/lib/action-center/needs-you";
import { needsYouTotal } from "@/lib/action-center/review-routing";
import { reviewCopy } from "@/components/review-details/copy";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { PREMIUM_HOME_COPY } from "./premium-home-copy";
import { clockIn } from "./owner-b/owner-b-copy";
import type { PortalLang } from "@/lib/i18n/portal-lang";
type QuietWords = (typeof PREMIUM_HOME_COPY)["en"]["quiet"];
import type { ActionCenter, ActionItem } from "@/lib/action-center/project";
import type { Today, TodayShift } from "@/lib/today/project";
import type { ClockMonitor, ClockMonitorEmployee } from "@/lib/time-clock";
import { useClockMonitor } from "./clean/use-clock-monitor";
import { OwnerHomeCorp, toDoSentence } from "./owner-home-corp";
import type { HomeBWeek } from "./owner-b/home-b";
import type { NextPay } from "./payroll/my-pay";

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
  /** SCRUM-218: `setup` is the first-week card, a whole card of its own (no "Finish setting up" wrapper, not repeated). */
  setupCard?: boolean;
  /** The Owner's plan and billing notice (trial ending, failed renewal, paused access), when it applies. */
  billing?: ReactNode;
  /** When the Owner setup card lists the setup items, they leave Planning. */
  setupHoldsItems?: boolean;
  /** MK1: the next payday from My pay's pay schedule; Home shows it as one Coming up row. */
  nextPay?: NextPay;
  payrollStatus?: HomePayrollStatus | null;
  /** Quiet (v4): the workspace name in Home's top bar. */
  workspaceName?: string;
  /** Corporate (Release 1): Owner and Manager Home on the corporate kit. */
  corporate?: boolean;
  /** Direction B (phones): This week's figures and Payday's destination. */
  homeB?: HomeBWeek;
};

const clock = (iso: string, timeZone: string, lang: PortalLang = "en") => {
  try { return clockIn(lang, new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(iso))); }
  catch { return ""; }
};
const workspaceDay = (iso: string, timeZone: string) => {
  try { return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso)); }
  catch { return undefined; }
};


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
export function PremiumHomeSurface({ greeting, dateLabel, timeZone, workspaceName, setup, setupCard = false, billing, setupHoldsItems = false, today, monitor = null, monitorPending = false, todayRefreshing = false, onRetryToday,
  actions, actionsConnection, onRetryActions, liveReaders, offline = false, nextPay, payrollStatus, corporate = false, homeB }: PremiumHomeSurfaceProps) {
  const lang = usePortalLang(), words = PREMIUM_HOME_COPY[lang];
  const readyToday = today?.state === "ready" ? today : null;
  // r4 QA: Home remembers whether the Owner setup card shows, so the next route placeholder starts with its shape.
  const hasSetup = !!setup;
  useEffect(() => { try { sessionStorage.setItem("cm-home-setup", hasSetup ? "1" : "0"); } catch { /* storage off: the placeholder keeps its default shape */ } }, [hasSetup]);
  const readyActions = actions?.state === "ready" ? (setupHoldsItems ? withoutSetupItems(actions).snapshot : actions) : null;
  const items = readyActions?.state === "ready" ? readyActions.items : [];
  const day = readyActions?.state === "ready" ? workspaceDay(readyActions.observedAt, timeZone) : undefined;
  const todayFailed = today?.state === "unavailable";
  const value = readyActions && (readyToday || todayFailed) ? needsYou(items, day, readyToday?.missed ?? [], readyActions?.state === "ready" ? workspaceNow(readyActions.observedAt, timeZone) : undefined) : null;
  const retryAll = () => { onRetryActions?.(); onRetryToday?.(); focusAfterRetry("#home-needs-you .nv-card__title", ".premium-pending-failed .nv-btn"); };
  // The band's one live line. Once Home has numbers the Needs you card says them, so the line is for screen readers only.
  // Corporate Home names its card ("5 things to do today."); the older looks keep their line.
  // Phase 4 (U03): with clock-ins unread or review facts missing, the count is a lower bound and a zero is not all-clear.
  const total = value ? needsYouTotal(value, { clockInsUnavailable: todayFailed }) : null;
  const summary = value && total ? corporate ? toDoSentence(value.count, total.exact, lang) : total.exact ? (lang === "es" ? words.needsYou(value.count) : needsYouSentence(value.count)) : value.count ? words.today(reviewCopy(lang).needYou(value.count, false)) : `${reviewCopy(lang).notAllChecked}.`
    : actionsConnection === "offline" ? words.offline
    : actionsConnection === "paused" ? words.paused
    : actionsConnection === "unavailable" || actionsConnection === "access_lost" || today?.state === "unavailable" ? words.failed
    : words.checking;

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

  // Corporate (Release 1, approved board C-Owner): Today, Payday and Things to do on the corporate kit.
  if (corporate) return <OwnerHomeCorp greeting={greeting} dateLabel={dateLabel} summary={summary} today={today} monitor={monitor} monitorPending={monitorPending}
    todayRefreshing={todayRefreshing} onRetryToday={onRetryToday} offline={offline} value={value} connection={offline ? "offline" : actionsConnection} onRetryActions={retryAll}
    timecards={items.filter(item => item.type === "TIMECARD")} timecardsReady={!!readyActions} businessDay={readyToday?.today ?? day} nextPay={nextPay} payrollStatus={payrollStatus} setup={setup} setupCard={setupCard} billing={billing} liveReaders={liveReaders} week={homeB} />;
  // Quiet (v4, approved Oct 23): top bar, title, Right now, Needs you, Setup. Nothing else on Home.
  return <div className="q-page premium-home cm-home" data-nv-page="" data-live-readers={liveReaders}>
    <QuietBar org={workspaceName}><QuietBarIcon href="/app/notifications" label={words.quiet.notifications}><BellIcon weight="bold" className="q-ic" aria-hidden="true" /></QuietBarIcon></QuietBar>
    <QuietHeader title={words.quiet.title} sub={<>{dateLabel}<span role="status" className="q-sr">{summary}</span></>} />
    <QuietRightNow today={today} monitor={monitor} monitorPending={monitorPending} refreshing={todayRefreshing} onRetry={onRetryToday} timeZone={timeZone} offline={offline} paused={actionsConnection === "paused"} q={words.quiet} lang={lang} />
    <div className="cm-home__now" ref={nowColumn}>
      {value ? <QuietNeedsYou value={value} timeZone={timeZone} observedAt={readyToday?.observedAt} exact={total?.exact ?? true} q={words.quiet} lang={lang} /> : <QuietPending connection={offline ? "offline" : actionsConnection} onRetry={retryAll} q={words.quiet} />}
    </div>
    {setup}
  </div>;
}

const peopleOf = (shifts: TodayShift[]) => new Set(shifts.map(shift => shift.employeeId)).size;
const firstNames = (names: string[], q?: QuietWords) => {
  const first = names.map(name => name.split(/\s+/)[0] ?? name), and = q?.and ?? "and", more = q?.more ?? ((n: number) => `${n} more`);
  return first.length <= 2 ? first.join(` ${and} `) : `${first.slice(0, 2).join(", ")} ${and} ${more(first.length - 2)}`;
};

/** Right now: one row, "6 of 8 on shift", and who starts next. A zero is said in words. */
function QuietRightNow({ today, monitor, monitorPending = false, refreshing, onRetry, timeZone, offline = false, paused = false, q = PREMIUM_HOME_COPY.en.quiet, lang = "en" }: { today: Today | null; monitor: ClockMonitor | null; monitorPending?: boolean; refreshing: boolean; onRetry?: () => void; timeZone: string; offline?: boolean; paused?: boolean; q?: QuietWords; lang?: PortalLang }) {
  const section = (row: ReactNode) => <QuietSection id="home-working" title={q.rightNow}><QuietList label={q.rightNow}>{row}</QuietList></QuietSection>;
  if (!today || today.state !== "ready") {
    if (today?.state === "unavailable") return section(<QuietRow title={q.unavailable} detail={q.tryMoment}
      control={<button type="button" className="q-bs premium-today-retry" aria-disabled={refreshing || undefined}
        onClick={() => { if (refreshing || !onRetry) return; onRetry(); focusAfterRetry("#home-working-title", ".premium-today-retry"); }}>{refreshing ? q.trying : q.tryAgain}</button>} />);
    return section(<QuietRow title={offline ? q.offline : paused ? q.paused : q.checking} detail={offline ? q.updatesReconnect : paused ? q.updatesBack : " "} />);
  }
  const open = monitor?.state === "ready" ? monitor.employees : null;
  const onShift = open ? new Set(open.map(person => person.employeeId)).size : peopleOf(today.shifts.filter(working)) || today.counts.clockedIn;
  const scheduled = peopleOf(today.shifts);
  const onIds = new Set(open ? open.map(person => person.employeeId) : today.shifts.filter(working).map(shift => shift.employeeId));
  const next = today.shifts.filter(later).filter(shift => !onIds.has(shift.employeeId)).sort((a, b) => a.startAt.localeCompare(b.startAt))[0];
  const title = monitorPending && !open && today.counts.clockedIn ? q.checking
    : onShift === 0 ? (scheduled ? q.noneYet : q.noShifts)
    : scheduled ? q.of(onShift, scheduled) : q.on(onShift);
  const detail = next ? (onShift === 0 ? q.firstAt(clock(next.startAt, timeZone, lang)) : q.startsAt(next.employeeName, clock(next.startAt, timeZone, lang)))
    : onShift === 0 && scheduled ? q.noMore : undefined;
  return section(<QuietRow href="/app/schedule" title={title} detail={detail} label={[title, detail].filter(Boolean).join(", ") + q.openSchedule} />);
}

/** Needs you: one row per kind, said as one phrase ("2 open shifts"). The one red is how late someone is. */
function QuietNeedsYou({ value, timeZone, observedAt, exact = true, q = PREMIUM_HOME_COPY.en.quiet, lang = "en" }: { value: NeedsYou; timeZone: string; observedAt?: string; exact?: boolean; q?: QuietWords; lang?: PortalLang }) {
  if (value.count === 0) return <QuietSection id="home-needs-you" title={q.thingsToDo}><p className="q-empty">{exact ? q.nothing : reviewCopy(lang).notAllCheckedLine}</p></QuietSection>;
  const gaps = value.now.filter(item => item.type === "COVERAGE_GAP");
  const urgentRequests = value.now.filter(item => item.category === "requests");
  const otherUrgent = value.now.filter(item => item.type !== "COVERAGE_GAP" && item.category !== "requests");
  const requests = [...urgentRequests, ...value.requests];
  const person = (item: ActionItem) => presentItem({ ...item, detail: mobileActionDetail(item.detail) }, "", timeZone, lang).person;
  const now = observedAt ? Date.parse(observedAt) : NaN;
  const late = value.noClockIn;
  const one = late.length === 1 ? late[0] : null;
  const minutes = one && Number.isFinite(now) ? Math.max(1, Math.round((now - Date.parse(one.startAt)) / 60_000)) : 0;
  const ended = one ? one.status === "no_punches" : false;
  const kinds = [...new Set(requests.map(item => q.kind[item.type === "TIME_OFF" || item.type === "EXCHANGE" ? item.type : "CALLOUT"]))];
  const requestDetail = requests.length === 1 ? `${kinds[0][0].toUpperCase()}${kinds[0].slice(1)}${person(requests[0]) ? q.from(person(requests[0]) as string) : ""}`
    : kinds.length === 1 ? `${kinds[0][0].toUpperCase()}${kinds[0].slice(1)}` : `${kinds.slice(0, -1).join(", ").replace(/^./, c => c.toUpperCase())} ${q.and} ${kinds.at(-1)}`;
  const missedWord = lang === "es" ? q.missed : ATTENDANCE_WORDS.missed, notInWord = lang === "es" ? q.notClockedIn : ATTENDANCE_WORDS.notClockedIn;
  return <QuietSection id="home-needs-you" title={q.thingsToDo}>
    <QuietList label={q.thingsToDo}>
      {one ? <QuietRow href="/app/inbox?filter=now" title={`${ended ? missedWord : notInWord}: ${one.employeeName}`}
        detail={ended ? q.ended(clock(one.endAt, timeZone, lang)) : q.began(clock(one.startAt, timeZone, lang))}
        value={ended || !minutes ? undefined : minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60 ? `${minutes % 60} min` : ""}`.trim() : `${minutes} min`} tone="alert"
        label={q.lateLabel(one.employeeName)} />
      : late.length ? <QuietRow href="/app/inbox?filter=now" title={q.notClockedInCount(late.length)} detail={firstNames(late.map(shift => shift.employeeName), q)}
        label={lang === "es" ? q.noClockInLabel(late.length) : `${late.length} shifts with no ${CLOCK_IN}, open in Inbox`} /> : null}
      {gaps.length ? <QuietRow href="/app/inbox?filter=now" title={q.openShifts(gaps.length)}
        detail={locationCounts(gaps.map(item => ({ locationName: gapLocation(item) }))) || q.todayWord} label={q.openShiftsLabel(gaps.length)} /> : null}
      {otherUrgent.length ? <QuietRow href="/app/inbox?filter=now" title={q.urgent(otherUrgent.length)} detail={presentItem(otherUrgent[0], "", timeZone, lang).title}
        label={q.urgentLabel(otherUrgent.length)} /> : null}
      {requests.length ? <QuietRow href="/app/inbox?filter=requests" title={q.requests(requests.length)} detail={requestDetail}
        label={q.requestsLabel(requests.length)} /> : null}
    </QuietList>
  </QuietSection>;
}

function QuietPending({ connection, onRetry, q = PREMIUM_HOME_COPY.en.quiet }: { connection: ActionCenterConnection; onRetry?: () => void; q?: QuietWords }) {
  const busy = connection === "loading" || connection === "reconnecting";
  const message = busy ? q.pendingChecking : connection === "offline" ? q.pendingReconnect : connection === "paused" ? q.pendingBack
    : connection === "access_lost" ? q.pendingSignIn : connection === "not_allowed" ? q.pendingDenied : q.pendingFailed;
  return <section id="home-needs-you" aria-labelledby="home-needs-you-title" aria-busy={busy || undefined} className={busy ? undefined : "premium-pending-failed"}>
    <div className="q-sec"><h2 id="home-needs-you-title">{q.thingsToDo}</h2></div>
    <p className="q-empty">{message}</p>
    {connection === "access_lost" ? <a className="q-btn q-btn--sec" href="/login">{q.signIn}</a>
      : !busy && onRetry && connection !== "offline" && connection !== "paused" ? <button type="button" className="q-btn q-btn--sec" onClick={onRetry}>{q.tryAgain}</button> : null}
  </section>;
}

const locationCounts = (list: { locationName?: string | null }[]) => {
  const counts = new Map<string, number>();
  for (const entry of list) if (entry.locationName) counts.set(entry.locationName, (counts.get(entry.locationName) ?? 0) + 1);
  return [...counts].map(([name, n]) => `${name} ${n}`).join(" · ");
};

/** The coverage gap's place, from its detail ("Main Office · …") when the item carries no location name. */
function gapLocation(item: ActionItem) {
  const fromTitle = /\bat (.+)$/.exec(item.title)?.[1];
  return fromTitle ?? item.detail.split(" · ")[0] ?? null;
}

/** "2 PM", "5:30 PM": whole hours lose their ":00", as in the mockups. */


const working = (shift: TodayShift) => shift.status === "clocked_in" || shift.status === "on_break";
const later = (shift: TodayShift) => shift.status === "upcoming" || shift.status === "starting";

/** "in at 9:02 AM" — or, for a punch open since before today, "in since Sun 12:28 AM", so a stale clock-in is
 * visible instead of looking fresh (reviews 10, 11 and 50 of 50). */


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
  const clocks = new Map<string, ClockMonitorEmployee>();
  const matched = new Set<string>();
  for (const person of open.values()) {
    const candidates = today.shifts.filter(shift => shift.employeeId === person.employeeId && shift.locationId === person.locationId && shift.status !== "done");
    const punch = Date.parse(person.clockInAt);
    const distance = (shift: TodayShift) => Math.max(Date.parse(shift.startAt) - punch, punch - Date.parse(shift.endAt), 0);
    const shift = candidates.find(working) ?? candidates.sort((a, b) => distance(a) - distance(b) || a.startAt.localeCompare(b.startAt))[0];
    if (shift) { clocks.set(shift.id, person); matched.add(person.timeEntryId); }
  }
  const lanes: TimelineLane[] = [...today.shifts].sort((a, b) => a.startAt.localeCompare(b.startAt)).map(shift => {
    const planned = { from: Date.parse(shift.startAt), to: Date.parse(shift.endAt) };
    const clock = clocks.get(shift.id);
    const clockedInAt = clock?.clockInAt ?? (working(shift) ? shift.firstClockInAt : null);
    const recorded = clockedInAt && (working(shift) || clock) ? { from: Math.min(Date.parse(clockedInAt), now), to: now } : null;
    const kind: TimelineLane["kind"] = working(shift) || clock ? "in" : shift.status === "done" ? "done" : later(shift) ? "later" : "missed";
    return { key: shift.id, name: shift.employeeName, planned, recorded, kind, clockedInAt: kind === "done" ? shift.firstClockInAt : clockedInAt, shift };
  });
  for (const person of open.values()) if (!matched.has(person.timeEntryId)) lanes.push({ key: `open:${person.timeEntryId}`, name: person.employeeName, planned: null,
    recorded: { from: Math.min(Date.parse(person.clockInAt), now), to: now }, kind: "unscheduled", clockedInAt: person.clockInAt, shift: null });
  const hour = 3_600_000;
  const times = lanes.flatMap(lane => [lane.planned?.from, lane.planned?.to, lane.recorded?.from]).filter((time): time is number => Number.isFinite(time));
  // From the earliest start or clock-in (or now) to the latest end, or the hour after now, whichever is later.
  const from = Math.floor(Math.min(now, ...times) / hour) * hour;
  const to = Math.max(Math.ceil(Math.max(...times, now) / hour) * hour, Math.floor(now / hour) * hour + hour);
  return { lanes, from, to, now };
}
