"use client";
import "./owner-home-corp.css";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { CorpBadge, CorpBody, CorpButton, CorpButtonLink, CorpCard, CorpLink, CorpPage, CorpRow, CorpRows, CorpStats, CorpTitle } from "@/components/corp/corp";
import { focusAfterRetry } from "@/components/kit/focus-after-retry";
import { periodLabel, type NextPay } from "@/components/payroll/my-pay";
import type { ActionCenterConnection } from "./manager-action-center";
import type { NeedsYou } from "@/lib/action-center/needs-you";
import type { ActionItem } from "@/lib/action-center/project";
import type { Today, TodayShift } from "@/lib/today/project";
import type { ClockMonitor } from "@/lib/time-clock";
import { gapRow } from "./manager-inbox-corp";

/* Owner and Manager Home in the corporate look (Release 1; approved board C-Owner, Oct 26). Presentation only: every number
 * comes from the same reads as before (Today's published shifts, the clock-in monitor, the shared needs-you count that the
 * sidebar badge and Things to do use, and My pay's next payday). Three cards at most: Today, Payday, Things to do.
 * Owner premium (Oct 31, A5/A2/P3/P7): Today holds the shift counts and Things to do lists only the decisions, so no count
 * shows twice; Payday never claims timecards are approved when it doesn't know; Today keeps its final shape while it loads. */

const working = (shift: TodayShift) => shift.status === "clocked_in" || shift.status === "on_break";
const people = (shifts: TodayShift[]) => new Set(shifts.map(shift => shift.employeeId)).size;
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export type OwnerHomeCorpProps = {
  greeting: string;
  dateLabel: string;
  /** The live region's one line ("3 things need you today."). */
  summary: string;
  today: Today | null;
  monitor: ClockMonitor | null;
  monitorPending: boolean;
  todayRefreshing: boolean;
  onRetryToday?: () => void;
  offline: boolean;
  /** The shared needs-you read once it is ready; null while it loads or fails. */
  value: NeedsYou | null;
  connection: ActionCenterConnection;
  onRetryActions?: () => void;
  /** Period timecards still to approve, from the same action center read. */
  timecards: ActionItem[];
  /** The action center read behind `timecards` has loaded (an empty list then means none are waiting, not "unknown"). */
  timecardsReady?: boolean;
  /** The workspace's business date ("2026-10-31"), so Payday can tell whether a pay period has ended. */
  businessDay?: string;
  nextPay?: NextPay;
  setup?: ReactNode;
  liveReaders?: string;
};

export function OwnerHomeCorp(props: OwnerHomeCorpProps) {
  return <CorpPage className="c-home" label="Home">
    <div data-live-readers={props.liveReaders} hidden />
    <CorpTitle title={props.greeting} sub={<>{props.dateLabel}<span role="status" className="c-sr">{props.summary}</span></>} />
    <TodayCard {...props} />
    <PaydayCard nextPay={props.nextPay} timecards={props.timecards} ready={props.timecardsReady ?? props.value !== null} connection={props.connection} businessDay={props.businessDay} />
    <ThingsToDo {...props} />
  </CorpPage>;
}

/* P7: Home remembers whether its last Today card had an open shift, so while the reads load the card keeps that shape and
 * the cards below don't jump when Find cover arrives. Client-only; the server render and a first visit assume none. */
const GAP_KEY = "cm-home-gap";
const noSubscribe = () => () => {};
const rememberedGap = () => { try { return sessionStorage.getItem(GAP_KEY) === "1"; } catch { return false; } };

/** Today: who is clocked in out of who is scheduled, shifts with no clock-in, open shifts; the first open shift offers Find cover. */
function TodayCard({ today, monitor, monitorPending, todayRefreshing, onRetryToday, offline, value, connection }: OwnerHomeCorpProps) {
  const card = (body: ReactNode) => <CorpCard id="home-working" label="Today" aside={<CorpLink href="/app?view=attendance">Who’s working</CorpLink>}>{body}</CorpCard>;
  const hadGap = useSyncExternalStore(noSubscribe, rememberedGap, () => false);
  const gaps = value ? value.now.filter(item => item.type === "COVERAGE_GAP") : null;
  const gapCount = today?.state === "ready" && gaps ? gaps.length : null;
  useEffect(() => { if (gapCount !== null) try { sessionStorage.setItem(GAP_KEY, gapCount ? "1" : "0"); } catch { /* storage off: the next load assumes no open shift */ } }, [gapCount]);
  const failed = today?.state === "unavailable";
  const waiting = !failed && !offline && connection !== "paused";
  // While a read is on its way the card already has its final shape: the three counts as "…", and the open-shift row's
  // place when the last Home had one.
  const pendingGap = hadGap && waiting && gaps === null ? <div className="c-home__gap c-home__gap--wait">
    <span className="c-row__main"><span className="c-row__title">Checking open shifts…</span></span>
  </div> : null;
  if (!today || today.state !== "ready") {
    if (!failed && waiting) return card(<div aria-busy="true"><p className="c-sr">Checking who’s on shift…</p>
      <CorpStats items={[{ label: "Clocked in", value: "…" }, { label: "No clock-in", value: "…" }, { label: "Open shifts", value: "…" }]} />{pendingGap}</div>);
    // P3: the kit's one error card when the read failed; offline and paused say so in a plain line.
    if (failed) return card(<div className="c-error-card"><p className="c-error-card__title">Who’s on shift isn’t available</p>
      <p className="c-error-card__body">Check your connection, then try again.</p>
      {onRetryToday ? <CorpButton kind="neutral" className="c-error-card__action premium-today-retry" aria-disabled={todayRefreshing || undefined}
        onClick={() => { if (todayRefreshing) return; onRetryToday(); focusAfterRetry("#home-working-label", ".premium-today-retry"); }}>{todayRefreshing ? "Trying…" : "Try again"}</CorpButton> : null}</div>);
    return card(<CorpBody><p className="c-home__state">{offline ? "You’re offline. Updates when you reconnect." : "Paused while you’re away."}</p></CorpBody>);
  }
  const open = monitor?.state === "ready" ? monitor.employees : null;
  const scheduled = today.shifts.length ? people(today.shifts) : today.counts.scheduled;
  const onShift = open ? new Set(open.map(person => person.employeeId)).size : people(today.shifts.filter(working)) || today.counts.clockedIn;
  const checking = monitorPending && !open && today.counts.clockedIn > 0;
  const noClockIn = value ? value.noClockIn.length : null;
  // The first open shift reads as on Things to do: "12:00 AM – 6:00 AM" over "Today · Condado · 1 needed".
  const gap = gaps?.[0] ? gapRow(gaps[0], today.timeZone, today.today) : undefined;
  return card(<>
    <CorpStats items={[
      // Rule 4: the number and its context at one size ("0 of 1").
      { label: "Clocked in", value: checking ? "…" : scheduled ? `${onShift} of ${scheduled}` : String(onShift) },
      { label: "No clock-in", value: noClockIn ?? "…", tone: noClockIn ? "red" : undefined },
      { label: "Open shifts", value: gaps ? gaps.length : "…", tone: gaps?.length ? "amber" : undefined },
    ]} />
    {gap ? <div className="c-home__gap">
      <span className="c-row__main"><span className="c-row__title c-row__title--b">{gap.title}</span><span className="c-row__detail"><span>{gap.detail}</span></span></span>
      <CorpButtonLink href={gap.href} size="md" aria-label={`Find cover: ${gap.title}, ${gap.detail}`}>Find cover</CorpButtonLink>
    </div> : pendingGap}
  </>);
}

const dayName = (date: string, style: "long" | "short") => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: style, ...(style === "short" ? { month: "short", day: "numeric" } : {}) }).format(new Date(`${date}T12:00:00Z`));
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
/** A timecard item's pay period end, from the review link the server built for it (`/app/timecards?start=…&end=…`). */
const periodEnd = (item: ActionItem) => { try { return new URL(item.href, "https://nevora.invalid").searchParams.get("end"); } catch { return null; } };

/** Payday: the next payday and where its timecards stand. Approvals open the day after a period ends (as Timecards says), so
 * before then the card says when they open; it names a count to approve only for periods that have ended; and it never says
 * "approved" (an empty list can mean none were recorded) or claims anything while the read is loading or has failed. */
function PaydayCard({ nextPay, timecards, ready, connection, businessDay }: { nextPay?: NextPay; timecards: ActionItem[]; ready: boolean; connection: ActionCenterConnection; businessDay?: string }) {
  if (!nextPay && !(ready && timecards.length)) return null;
  const when = nextPay ? nextPay.daysUntil <= 0 ? "Payday today" : nextPay.daysUntil === 1 ? "Payday tomorrow"
    : `Payday ${dayName(nextPay.payday, "short")}` : "Timecards to approve";
  const ends = timecards.map(periodEnd);
  const closed = businessDay ? ends.filter(end => end && end < businessDay).length : 0;
  // The earliest period still open: a waiting timecard's, or else the next payday's own period.
  const openEnd = businessDay ? [...ends, nextPay?.period?.endDate].filter((end): end is string => !!end && end >= businessDay).sort()[0] : undefined;
  // While the read is out of reach the line says so (and keeps the card's height); it never guesses a count.
  const status = !ready ? connection === "loading" || connection === "reconnecting" ? "Checking timecards…" : connection === "offline" ? "Updates when you reconnect"
      : connection === "paused" ? "Updates when you’re back" : "Timecards aren’t available right now"
    : closed ? `${count(closed, "timecard", "timecards")} to approve`
    : openEnd && businessDay ? `Approvals open after ${daysBetween(businessDay, openEnd) <= 6 ? dayName(openEnd, "long") : dayName(openEnd, "short")}`
    : "No timecards waiting";
  const detail = [nextPay?.period ? periodLabel(nextPay.period.startDate, nextPay.period.endDate) : "", status].filter(Boolean).join(" · ");
  const act = ready && closed > 0;
  return <CorpCard as="div" ariaLabel="Payday">
    <div className="c-home__payday">
      <CorpRow title={when} bold detail={detail || undefined} href="/app/timecards" trail={act ? <span className="c-link c-link--l" aria-hidden="true">Review</span> : undefined}
        chevron={!act} label={[when, detail, act ? "Review timecards" : "View timecards"].filter(Boolean).join(". ")} />
    </div>
  </CorpCard>;
}

/** Things to do on Home: only the decisions people are waiting on (requests, corrections, other urgent items). Shifts with no
 * clock-in and open shifts stay in Today above, so no count shows twice. The header carries no total: each row says what
 * it counts, and the full page and the sidebar keep the one shared total. Each row opens where the decision is made. */
function ThingsToDo({ value, connection, offline, onRetryActions, setup }: OwnerHomeCorpProps) {
  if (!value) {
    const busy = connection === "loading" || connection === "reconnecting";
    const quiet = offline || connection === "offline" || connection === "paused";
    const message = busy ? "Checking what needs you…" : offline || connection === "offline" ? "Updates when you reconnect." : connection === "paused" ? "Updates when you’re back."
      : "Sign in again to see what needs you.";
    // P3: a failed read is the kit's error card with Try again; loading, offline, paused and signed-out say so in a line.
    return <CorpCard id="home-needs-you" label="Things to do">
      {!busy && !quiet && connection !== "access_lost" ? <div className="c-error-card"><p className="c-error-card__title">Things to do isn’t available</p>
        <p className="c-error-card__body">Check your connection, then try again.</p>
        {onRetryActions ? <CorpButton kind="neutral" className="c-error-card__action" onClick={onRetryActions}>Try again</CorpButton> : null}</div>
      : <CorpBody><p className="c-home__state" aria-busy={busy || undefined}>{message}</p>
        {connection === "access_lost" ? <CorpButtonLink href="/login" kind="secondary" size="md" native>Sign in</CorpButtonLink> : null}
      </CorpBody>}
      {setup}
    </CorpCard>;
  }
  const requests = [...value.now.filter(item => item.category === "requests"), ...value.requests];
  const of = (type: string) => requests.filter(item => item.type === type).length;
  const known = ["TIME_OFF", "EXCHANGE", "CALLOUT"];
  const urgent = value.now.filter(item => item.type !== "COVERAGE_GAP" && item.category !== "requests");
  const corrections = urgent.filter(item => item.type === "TIME_CORRECTION").length;
  const rows = [
    { title: "Time off requests", n: of("TIME_OFF"), href: "/app/requests" },
    { title: "Time corrections", n: corrections, href: "/app/inbox#todo-corrections" },
    { title: "Shift swaps", n: of("EXCHANGE"), href: "/app/exchange" },
    { title: "Can’t-work reports", n: of("CALLOUT"), href: "/app/inbox#todo-cant-work" },
    { title: "Other requests", n: requests.filter(item => !known.includes(item.type)).length, href: "/app/inbox#todo-requests" },
    { title: "Other items to review", n: urgent.length - corrections, href: "/app/inbox#todo-review" },
  ].filter(row => row.n > 0);
  const shiftsOnly = value.count > 0;
  return <CorpCard id="home-needs-you" label="Things to do" aside={<CorpLink href="/app/inbox" label="See all things to do">See all</CorpLink>}>
    {rows.length ? <CorpRows label="Things to do">
      {rows.map(row => <li key={row.title}><CorpRow title={row.title} href={row.href} one trail={<CorpBadge count={row.n} />} chevron label={`${row.title}, ${row.n}`} /></li>)}
    </CorpRows> : <div className="c-empty c-empty--card">{shiftsOnly
      ? <><b className="c-empty__title">No requests waiting</b><span className="c-empty__body">Open shifts and missing clock-ins are under Today.</span></>
      : <><b className="c-empty__title">You’re all set</b><span className="c-empty__body">Nothing needs you right now.</span></>}</div>}
    {setup}
  </CorpCard>;
}
