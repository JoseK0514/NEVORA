"use client";
import { parsePeriod } from '@/lib/timecards/project';
import type { HomePayrollStatus } from '@/lib/payroll/backlog-read';
import "./owner-home-corp.css";
import { isStaffingRepair } from "@/lib/time-off-staffing/present";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { CORP_NO_VALUE, CorpBody, CorpButton, CorpButtonLink, CorpCard, CorpLink, CorpLoadFailed, CorpPage, CorpRow, CorpRows, CorpTitle } from "@/components/corp/corp";
import { focusAfterRetry } from "@/components/kit/focus-after-retry";
import { periodLabel, type NextPay } from "@/components/payroll/my-pay";
import type { ActionCenterConnection } from "./manager-action-center";
import type { NeedsYou } from "@/lib/action-center/needs-you";
import type { ActionItem } from "@/lib/action-center/project";
import type { Today, TodayShift } from "@/lib/today/project";
import type { ClockMonitor } from "@/lib/time-clock";
import { gapRow } from "./manager-inbox-corp";
import { HomeB, type HomeBWeek } from "./owner-b/home-b";
export { toDoSentence } from "./manager-inbox-corp";

/* Owner and Manager Home in the corporate look (Release 1; approved board C-Owner, Oct 26). Presentation only: every number
 * comes from Today's published shifts, the clock-in monitor, the shared needs-you count, My pay's next payday and
 * the protected Owner payroll preparation read. Three cards at most: Today, Payday, Things to do.
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
  /** Period timecards still to review or finalize, from the same action center read. */
  timecards: ActionItem[];
  /** The action center read behind `timecards` has loaded (an empty list then means none are waiting, not "unknown"). */
  timecardsReady?: boolean;
  /** The workspace's business date ("2026-10-31"), so Payday can tell whether a pay period has ended. */
  businessDay?: string;
  nextPay?: NextPay;
  payrollStatus?: HomePayrollStatus | null;
  setup?: ReactNode;
  liveReaders?: string;
  /** Direction B (phones): the week behind This week, and where Payday's button goes. */
  week?: HomeBWeek;
};

export function OwnerHomeCorp(props: OwnerHomeCorpProps) {
  return <CorpPage className="c-home" label="Home">
    <div data-live-readers={props.liveReaders} hidden />
    {/* Direction B: the phone screen (shown on phones under data-nv-b; tablets and desktop keep the cards below). */}
    <HomeB today={props.today} monitor={props.monitor} monitorPending={props.monitorPending} offline={props.offline} value={props.value} connection={props.connection}
      timecards={props.timecards} timecardsReady={props.timecardsReady ?? props.value !== null} businessDay={props.businessDay} nextPay={props.nextPay} setup={props.setup}
      dateLabel={props.dateLabel} summary={props.summary} week={props.week} greeting={props.greeting} onRetry={props.onRetryActions} />
    <CorpTitle title={props.greeting} sub={<>{props.dateLabel}<span role="status" className="c-sr">{props.summary}</span></>} />
    <TodayCard {...props} />
    <PaydayCard nextPay={props.nextPay} payrollStatus={props.payrollStatus} timecards={props.timecards} ready={props.timecardsReady ?? props.value !== null} connection={props.connection} businessDay={props.businessDay} />
    <ThingsToDo {...props} />
  </CorpPage>;
}

/* P7: Home remembers whether its last Today card had an open shift, so while the reads load the card keeps that shape and
 * the cards below don't jump when Find cover arrives. Client-only; the server render and a first visit assume none. */
const GAP_KEY = "cm-home-gap";
const noSubscribe = () => () => {};
const rememberedGap = () => { try { return sessionStorage.getItem(GAP_KEY) === "1"; } catch { return false; } };

/** One Today figure. Owner premium R6: each figure opens its list (hover and press from the kit's row states, focus ring
 * from the kit); while a read is on its way it is plain text, so an empty figure never links anywhere. Figures are ink
 * (R3): the row under the figures and the list it opens say what is wrong, not a colour. Nov 1 upscale: a figure that
 * hasn't arrived or couldn't load is the kit's grey "—" (never a word or "…"). */
function Stat({ label, value, href, aria }: { label: string; value: ReactNode; href?: string; aria?: string }) {
  const none = value === CORP_NO_VALUE;
  const body = <><span className="c-stat__label">{label}</span><span className={none ? "c-stat__value c-stat__value--none c-num" : "c-stat__value c-num"}>{value}</span></>;
  return href ? <Link className="c-stat c-home__stat" href={href} aria-label={aria}>{body}</Link> : <div className="c-stat c-home__stat">{body}</div>;
}

/** Today: who is on shift out of who is scheduled, shifts with no clock-in, open shifts; the first open shift offers Find cover.
 * R6: Home's one focus. Full width on desktop, the figures open Who's working, the missed clock-ins and the open shifts. */
function TodayCard({ today, monitor, monitorPending, todayRefreshing, onRetryToday, offline, value, connection }: OwnerHomeCorpProps) {
  const card = (body: ReactNode, aside: ReactNode = <CorpLink href="/app?view=attendance">Who’s working</CorpLink>) => <CorpCard id="home-working" label="Today" aside={aside}>{body}</CorpCard>;
  const dash = <div className="c-stats c-home__stats"><Stat label={LABELS.on} value={CORP_NO_VALUE} /><Stat label={LABELS.missed} value={CORP_NO_VALUE} /><Stat label={LABELS.open} value={CORP_NO_VALUE} /></div>;
  const hadGap = useSyncExternalStore(noSubscribe, rememberedGap, () => false);
  const gaps = value ? value.now.filter(item => item.type === "COVERAGE_GAP") : null;
  const gapCount = today?.state === "ready" && gaps ? gaps.length : null;
  useEffect(() => { if (gapCount !== null) try { sessionStorage.setItem(GAP_KEY, gapCount ? "1" : "0"); } catch { /* storage off: the next load assumes no open shift */ } }, [gapCount]);
  const failed = today?.state === "unavailable";
  const waiting = !failed && !offline && connection !== "paused";
  // While a read is on its way the card already has its final shape: the three counts as "—", and the open-shift row's
  // place when the last Home had one.
  const pendingGap = hadGap && waiting && gaps === null ? <div className="c-home__gap c-home__gap--wait">
    <span className="c-row__main"><span className="c-row__title">Checking open shifts…</span></span>
  </div> : null;
  if (!today || today.state !== "ready") {
    if (!failed && waiting) return card(<div aria-busy="true"><p className="c-sr">Checking who’s on shift…</p>{dash}{pendingGap}</div>);
    // Nov 1 upscale (kit consistency 7): a failed read keeps the card's shape, its figures "—", and the header says
    // "Couldn't load · Try again"; offline and paused say so in a plain line.
    if (failed) return card(<><p className="c-sr">Who’s on shift isn’t available.</p>{dash}</>,
      <CorpLoadFailed busy={todayRefreshing} onRetry={onRetryToday ? () => { onRetryToday(); focusAfterRetry("#home-working-label", "#home-working .c-fail__retry"); } : undefined} />);
    return card(<CorpBody><p className="c-home__state">{offline ? "You’re offline. Updates when you reconnect." : "Paused while you’re away."}</p></CorpBody>);
  }
  const open = monitor?.state === "ready" ? monitor.employees : null;
  const scheduled = today.shifts.length ? people(today.shifts) : today.counts.scheduled;
  const onShift = open ? new Set(open.map(person => person.employeeId)).size : people(today.shifts.filter(working)) || today.counts.clockedIn;
  const checking = monitorPending && !open && today.counts.clockedIn > 0;
  const noClockIn = value ? value.noClockIn.length : null;
  // The first open shift reads as on Things to do, without the "Today ·" the card's header already says (Nov 1 upscale):
  // "12:00 AM – 6:00 AM" over "Condado · Needs 1 person".
  const gap = gaps?.[0] ? homeGap(gapRow(gaps[0], today.timeZone, today.today)) : undefined;
  // R6, desktop: the hero lists today's next two open shifts under the first (phones keep one, so Home stays short).
  const more = (gaps ?? []).slice(1, 3).map(item => homeGap(gapRow(item, today.timeZone, today.today)));
  const onText = checking ? CORP_NO_VALUE : scheduled ? `${onShift} of ${scheduled}` : String(onShift);
  // Rule 4: the figure in ink and its context ("of 1") quieter, on one line.
  const onValue = !checking && scheduled ? <>{onShift}<span className="c-home__of"> of {scheduled}</span></> : onText;
  // One open shift opens its Find cover; several (or none) open the Schedule, where every open shift is.
  const openHref = gaps?.length === 1 && gap ? gap.href : "/app/schedule";
  return card(<>
    <div className="c-stats c-home__stats">
      {/* Rule 4: the number and its context at one size ("0 of 1"). */}
      <Stat label={LABELS.on} value={onValue} href={checking ? undefined : "/app?view=attendance"} aria={checking ? undefined : `${LABELS.on}: ${onText}. Who’s working`} />
      <Stat label={LABELS.missed} value={noClockIn ?? CORP_NO_VALUE} href={noClockIn === null ? undefined : "/app/inbox#todo-missed"} aria={noClockIn === null ? undefined : `${LABELS.missed}: ${noClockIn}`} />
      <Stat label={LABELS.open} value={gaps ? gaps.length : CORP_NO_VALUE} href={gaps ? openHref : undefined}
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
/* Nov 1 upscale: one short word or two per figure, so all three labels sit on one line on a phone. "Clocked in" is the word
 * Who's working uses for the same people. */
const LABELS = { on: "Clocked in", missed: "Missed", open: "Open shifts" } as const;
/** Home's Today card already says Today, so an open shift's detail starts at its place ("Condado · Needs 1 person"). */
const homeGap = <T extends { detail?: string }>(row: T): T => row.detail ? { ...row, detail: row.detail.replace(/^Today · /, "") } : row;

const dayName = (date: string, style: "long" | "short") => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: style, ...(style === "short" ? { month: "short", day: "numeric" } : {}) }).format(new Date(`${date}T12:00:00Z`));
const nextDay = (date: string) => new Date(Date.parse(`${date}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
/** Keep the exact canonical review period; dropping it would open the current week instead of the counted cards. */
const timecardPeriod = (item: ActionItem) => {
  try {
    const url = new URL(item.href, "https://nevora.invalid");
    return url.pathname === "/app/timecards" ? parsePeriod(url.searchParams.get("start") ?? "", url.searchParams.get("end") ?? "") : null;
  } catch { return null; }
};

/** Payday: the next payday, then what to do about its timecards and when (R7). Approvals open the day after a period ends
 * (as Timecards says), so before then the card names that day ("You can approve from Mon, Nov 2"); it names a count to
 * review only for periods that have ended; and it never says "approved" (an empty list can mean none were recorded) or
 * claims anything while the read is loading or has failed. Owner payroll preparation facts use the same card. */
function PaydayCard({ nextPay, payrollStatus, timecards, ready, connection, businessDay }: { nextPay?: NextPay; payrollStatus?: HomePayrollStatus | null; timecards: ActionItem[]; ready: boolean; connection: ActionCenterConnection; businessDay?: string }) {
  const payrollNeedsAttention = payrollStatus?.state === 'unavailable' || (payrollStatus?.state === 'ready' && (payrollStatus.overdue || payrollStatus.reviewRequired));
  if (!nextPay && !payrollNeedsAttention && !(ready && timecards.length)) return null;
  // "Tue, Nov 3" with how far away it is in grey ("Tomorrow", "In 3 days"); the card's label already says Payday.
  const when = nextPay ? dayName(nextPay.payday, "short") : null;
  const away = nextPay ? nextPay.daysUntil <= 0 ? "Today" : nextPay.daysUntil === 1 ? "Tomorrow" : `In ${nextPay.daysUntil} days` : undefined;
  const periods = timecards.map(timecardPeriod);
  const ends = periods.map(period => period?.endDate);
  const closed = new Map<string, {startDate: string; endDate: string; count: number}>();
  if (ready && businessDay) for (const period of periods) {
    if (!period || period.endDate >= businessDay) continue;
    const key = `${period.startDate}:${period.endDate}`;
    const group = closed.get(key);
    if (group) group.count++;
    else closed.set(key, {...period, count: 1});
  }
  // The earliest period still open: a waiting timecard's, or else the next payday's own period.
  const openEnd = businessDay ? [...ends, nextPay?.period?.endDate].filter((end): end is string => !!end && end >= businessDay).sort()[0] : undefined;
  // While the read is out of reach the line says so (and keeps the card's height); it never guesses a count.
  const step: { title: string; detail: string } = !ready
    ? { title: "Timecards", detail: connection === "loading" || connection === "reconnecting" ? "Checking timecards…" : connection === "offline" ? "Updates when you reconnect"
      : connection === "paused" ? "Updates when you’re back" : "Timecards aren’t available right now" }
    : openEnd ? { title: "Approve timecards", detail: `You can approve from ${dayName(nextDay(openEnd), "short")}` }
    : { title: "Timecards", detail: "No timecards waiting" };
  const period = nextPay?.period ? periodLabel(nextPay.period.startDate, nextPay.period.endDate) : "";
  const label = when ? "Payday" : payrollNeedsAttention ? "Payroll" : "Timecards";
  const payrollFact = (title: string, fact: {payday: string; period: {startDate: string; endDate: string}}) => {
    const fullDate = (date: string) => new Intl.DateTimeFormat("en-US", {timeZone: "UTC", month: "short", day: "numeric", year: "numeric"}).format(new Date(`${date}T12:00:00Z`));
    const detail = `Payday ${dayName(fact.payday, "short")}, ${fact.payday.slice(0, 4)} · Pay period ${fullDate(fact.period.startDate)} – ${fullDate(fact.period.endDate)}`;
    return <li className="c-home__payroll-fact"><CorpRow title={title} detail={detail} href="/app/payroll" chevron label={`${title}. ${detail}. Opens Payroll`} /></li>;
  };
  return <CorpCard id="home-payday" label={label}>
    <CorpRows label={label}>
      {payrollStatus?.state === 'unavailable' ? <li><CorpRow title="Payroll" detail="Payroll status isn’t available right now" href="/app/payroll" chevron label="Payroll status isn’t available right now. Opens Payroll" /></li> : null}
      {payrollStatus?.state === 'ready' && payrollStatus.overdue ? payrollFact("Payroll to prepare", payrollStatus.overdue) : null}
      {payrollStatus?.state === 'ready' && payrollStatus.reviewRequired ? payrollFact("Payroll schedule needs review", payrollStatus.reviewRequired) : null}
      {when ? <li><CorpRow title={when} bold detail={period ? `Pay period ${period}` : undefined} value={away} valueTone="soft" /></li> : null}
      {closed.size ? [...closed.values()].sort((a, b) => a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate)).map(period => {
        const title = `Review ${count(period.count, "timecard", "timecards")}`;
        const detail = `Before payroll · ${periodLabel(period.startDate, period.endDate)}`;
        return <li key={`${period.startDate}:${period.endDate}`} className="c-home__payday"><CorpRow title={title} detail={detail} href={`/app/timecards?start=${period.startDate}&end=${period.endDate}`} chevron label={`${title}. ${detail}. Opens Timecards`} /></li>;
      }) : <li className="c-home__payday"><CorpRow title={step.title} detail={step.detail} href="/app/timecards" chevron label={`${step.title}. ${step.detail}. Opens Timecards`} /></li>}
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
  // Nov 9, 2026: approved leave over a published shift is a shift to fill (Things to do's #todo-repair), not "other".
  const repairs = urgent.filter(isStaffingRepair).length;
  const rows = [
    { title: "Shifts to fill", n: repairs, href: "/app/inbox#todo-repair" },
    { title: "Time off requests", n: of("TIME_OFF"), href: "/app/requests" },
    { title: "Time corrections", n: corrections, href: "/app/inbox#todo-corrections" },
    { title: "Shift swaps", n: of("EXCHANGE"), href: "/app/exchange" },
    { title: "Can’t-work requests", n: of("CALLOUT"), href: "/app/inbox#todo-cant-work" },
    { title: "Other requests", n: requests.filter(item => !known.includes(item.type)).length, href: "/app/inbox#todo-requests" },
    { title: "Other items to review", n: urgent.length - corrections - repairs, href: "/app/inbox#todo-review" },
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
