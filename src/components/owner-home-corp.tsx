"use client";
import "./owner-home-corp.css";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { CorpBody, CorpButton, CorpButtonLink, CorpCard, CorpLink, CorpPage, CorpRow, CorpRows, CorpTitle } from "@/components/corp/corp";
import { focusAfterRetry } from "@/components/kit/focus-after-retry";
import { periodLabel, type NextPay } from "@/components/payroll/my-pay";
import type { ActionCenterConnection } from "./manager-action-center";
import type { NeedsYou } from "@/lib/action-center/needs-you";
import type { ActionItem } from "@/lib/action-center/project";
import type { Today, TodayShift } from "@/lib/today/project";
import type { ClockMonitor } from "@/lib/time-clock";
import { gapRow } from "./manager-inbox-corp";
export { toDoSentence } from "./manager-inbox-corp";

/* Owner and Manager Home in the corporate look (Release 1; approved board C-Owner, Oct 26). Presentation only: every number
 * comes from the same reads as before (Today's published shifts, the clock-in monitor, the shared needs-you count that the
 * sidebar badge and Things to do use, and My pay's next payday). Three cards at most: Today, Payday, Things to do.
 * Owner premium round 2 (R6): Today is the one focus, full width; its figures open their lists; Payday and Things to do
 * sit under it, level on desktop. Figures are ink (R3) and Payday says what to do and when (R7).
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

/** One Today figure. Owner premium R6: each figure opens its list (hover and press from the kit's row states, focus ring
 * from the kit); while a read is on its way it is plain text, so a "…" never links anywhere. Figures are ink (R3): the
 * row under the figures and the list it opens say what is wrong, not a colour. */
function Stat({ label, value, href, aria }: { label: string; value: ReactNode; href?: string; aria?: string }) {
  const body = <><span className="c-stat__label">{label}</span><span className="c-stat__value c-num">{value}</span></>;
  return href ? <Link className="c-stat c-home__stat" href={href} aria-label={aria}>{body}</Link> : <div className="c-stat c-home__stat">{body}</div>;
}

/** Today: who is on shift out of who is scheduled, shifts with no clock-in, open shifts; the first open shift offers Find cover.
 * R6: Home's one focus. Full width on desktop, the figures open Who's working, the missed clock-ins and the open shifts. */
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
      <div className="c-stats c-home__stats"><Stat label={LABELS.on} value="…" /><Stat label={LABELS.missed} value="…" /><Stat label={LABELS.open} value="…" /></div>{pendingGap}</div>);
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
  // The first open shift reads as on Things to do: "12:00 AM – 6:00 AM" over "Today · Condado · Needs 1 person".
  const gap = gaps?.[0] ? gapRow(gaps[0], today.timeZone, today.today) : undefined;
  // R6, desktop: the hero lists today's next two open shifts under the first (phones keep one, so Home stays short).
  const more = (gaps ?? []).slice(1, 3).map(item => gapRow(item, today.timeZone, today.today));
  const onValue = checking ? "…" : scheduled ? `${onShift} of ${scheduled}` : String(onShift);
  // One open shift opens its Find cover; several (or none) open the Schedule, where every open shift is.
  const openHref = gaps?.length === 1 && gap ? gap.href : "/app/schedule";
  return card(<>
    <div className="c-stats c-home__stats">
      {/* Rule 4: the number and its context at one size ("0 of 1"). */}
      <Stat label={LABELS.on} value={onValue} href={checking ? undefined : "/app?view=attendance"} aria={checking ? undefined : `${LABELS.on}: ${onValue}. Who’s working`} />
      <Stat label={LABELS.missed} value={noClockIn ?? "…"} href={noClockIn === null ? undefined : "/app/inbox#todo-missed"} aria={noClockIn === null ? undefined : `${LABELS.missed}: ${noClockIn}`} />
      <Stat label={LABELS.open} value={gaps ? gaps.length : "…"} href={gaps ? openHref : undefined}
        aria={gaps ? `${LABELS.open}: ${gaps.length}. ${gaps.length === 1 ? "Find cover" : "Schedule"}` : undefined} />
    </div>
    {gap ? <div className="c-home__gap">
      <span className="c-row__main"><span className="c-row__title c-row__title--b c-num">{gap.title}</span><span className="c-row__detail"><span>{gap.detail}</span></span></span>
      <CorpButtonLink href={gap.href} size="md" aria-label={`Find cover: ${gap.title}, ${gap.detail}`}>Find cover</CorpButtonLink>
    </div> : pendingGap}
    {more.length ? <ul className="c-rows c-home__more" aria-label="More open shifts today">{more.map(row => <li key={row.key}>
      <CorpRow href={row.href} title={<span className="c-num">{row.title}</span>} bold detail={row.detail} chevron label={`Find cover: ${row.title}, ${row.detail}`} />
    </li>)}</ul> : null}
  </>);
}
const LABELS = { on: "On shift now", missed: "Missed clock-ins", open: "Open shifts" } as const;

const dayName = (date: string, style: "long" | "short") => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: style, ...(style === "short" ? { month: "short", day: "numeric" } : {}) }).format(new Date(`${date}T12:00:00Z`));
const nextDay = (date: string) => new Date(Date.parse(`${date}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
/** A timecard item's pay period end, from the review link the server built for it (`/app/timecards?start=…&end=…`). */
const periodEnd = (item: ActionItem) => { try { return new URL(item.href, "https://nevora.invalid").searchParams.get("end"); } catch { return null; } };

/** Payday: the next payday, then what to do about its timecards and when (R7). Approvals open the day after a period ends
 * (as Timecards says), so before then the card names that day ("You can approve from Mon, Nov 2"); it names a count to
 * approve only for periods that have ended; and it never says "approved" (an empty list can mean none were recorded) or
 * claims anything while the read is loading or has failed. Two rows, so on desktop it sits level with Things to do. */
function PaydayCard({ nextPay, timecards, ready, connection, businessDay }: { nextPay?: NextPay; timecards: ActionItem[]; ready: boolean; connection: ActionCenterConnection; businessDay?: string }) {
  if (!nextPay && !(ready && timecards.length)) return null;
  // "Tue, Nov 3" with how far away it is in grey ("Tomorrow", "In 3 days"); the card's label already says Payday.
  const when = nextPay ? dayName(nextPay.payday, "short") : null;
  const away = nextPay ? nextPay.daysUntil <= 0 ? "Today" : nextPay.daysUntil === 1 ? "Tomorrow" : `In ${nextPay.daysUntil} days` : undefined;
  const ends = timecards.map(periodEnd);
  const closed = businessDay ? ends.filter(end => end && end < businessDay).length : 0;
  // The earliest period still open: a waiting timecard's, or else the next payday's own period.
  const openEnd = businessDay ? [...ends, nextPay?.period?.endDate].filter((end): end is string => !!end && end >= businessDay).sort()[0] : undefined;
  // While the read is out of reach the line says so (and keeps the card's height); it never guesses a count.
  const step: { title: string; detail: string } = !ready
    ? { title: "Timecards", detail: connection === "loading" || connection === "reconnecting" ? "Checking timecards…" : connection === "offline" ? "Updates when you reconnect"
      : connection === "paused" ? "Updates when you’re back" : "Timecards aren’t available right now" }
    : closed ? { title: `Approve ${count(closed, "timecard", "timecards")}`, detail: "Ready now" }
    : openEnd ? { title: "Approve timecards", detail: `You can approve from ${dayName(nextDay(openEnd), "short")}` }
    : { title: "Timecards", detail: "No timecards waiting" };
  const period = nextPay?.period ? periodLabel(nextPay.period.startDate, nextPay.period.endDate) : "";
  return <CorpCard id="home-payday" label={when ? "Payday" : "Timecards"}>
    <CorpRows label={when ? "Payday" : "Timecards"}>
      {when ? <li><CorpRow title={when} bold detail={period ? `Pay period ${period}` : undefined} value={away} valueTone="soft" /></li> : null}
      <li className="c-home__payday"><CorpRow title={step.title} detail={step.detail} href="/app/timecards" chevron label={`${step.title}. ${step.detail}. Opens Timecards`} /></li>
    </CorpRows>
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
      {/* R3: one count voice, the label then the figure in grey (badges stay in navigation). */}
      {rows.map(row => <li key={row.title}><CorpRow title={row.title} href={row.href} one value={row.n} valueTone="soft" chevron label={`${row.title}, ${row.n}`} /></li>)}
    </CorpRows> : <div className="c-empty c-empty--card">{shiftsOnly
      ? <><b className="c-empty__title">No requests waiting</b><span className="c-empty__body">Open shifts and missed clock-ins are under Today.</span></>
      : <><b className="c-empty__title">You’re all set</b><span className="c-empty__body">Nothing needs you right now.</span></>}</div>}
    {setup}
  </CorpCard>;
}
