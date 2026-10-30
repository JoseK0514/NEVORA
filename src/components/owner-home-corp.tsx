"use client";
import "./owner-home-corp.css";
import type { ReactNode } from "react";
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
 * sidebar badge and Things to do use, and My pay's next payday). Three cards at most: Today, Payday, Things to do. */

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
  nextPay?: NextPay;
  setup?: ReactNode;
  liveReaders?: string;
};

export function OwnerHomeCorp(props: OwnerHomeCorpProps) {
  return <CorpPage className="c-home" label="Home">
    <div data-live-readers={props.liveReaders} hidden />
    <CorpTitle title={props.greeting} sub={<>{props.dateLabel}<span role="status" className="c-sr">{props.summary}</span></>} />
    <TodayCard {...props} />
    <PaydayCard nextPay={props.nextPay} timecards={props.timecards} />
    <ThingsToDo {...props} />
  </CorpPage>;
}

/** Today: who is clocked in out of who is scheduled, shifts with no clock-in, open shifts; the first open shift offers Find cover. */
function TodayCard({ today, monitor, monitorPending, todayRefreshing, onRetryToday, offline, value, connection }: OwnerHomeCorpProps) {
  const card = (body: ReactNode) => <CorpCard id="home-working" label="Today" aside={<CorpLink href="/app?view=attendance">Who’s working</CorpLink>}>{body}</CorpCard>;
  if (!today || today.state !== "ready") {
    const failed = today?.state === "unavailable";
    return card(<CorpBody><p className="c-home__state">{failed ? "Who’s on shift isn’t available right now." : offline ? "You’re offline. Updates when you reconnect." : connection === "paused" ? "Paused while you’re away." : "Checking who’s on shift…"}</p>
      {failed && onRetryToday ? <CorpButton kind="secondary" size="md" className="premium-today-retry" aria-disabled={todayRefreshing || undefined}
        onClick={() => { if (todayRefreshing) return; onRetryToday(); focusAfterRetry("#home-working-label", ".premium-today-retry"); }}>{todayRefreshing ? "Trying…" : "Try again"}</CorpButton> : null}</CorpBody>);
  }
  const open = monitor?.state === "ready" ? monitor.employees : null;
  const scheduled = today.shifts.length ? people(today.shifts) : today.counts.scheduled;
  const onShift = open ? new Set(open.map(person => person.employeeId)).size : people(today.shifts.filter(working)) || today.counts.clockedIn;
  const checking = monitorPending && !open && today.counts.clockedIn > 0;
  const gaps = value ? value.now.filter(item => item.type === "COVERAGE_GAP") : null;
  const noClockIn = value ? value.noClockIn.length : null;
  // The first open shift reads as on Things to do: "12:00 AM – 6:00 AM" over "Today · Condado · 1 needed".
  const gap = gaps?.[0] ? gapRow(gaps[0], today.timeZone, today.today) : undefined;
  return card(<>
    <CorpStats items={[
      { label: "Clocked in", value: checking ? "…" : scheduled ? `${onShift} of ${scheduled}` : String(onShift) },
      { label: "No clock-in", value: noClockIn ?? "…", tone: noClockIn ? "red" : undefined },
      { label: "Open shifts", value: gaps ? gaps.length : "…", tone: gaps?.length ? "amber" : undefined },
    ]} />
    {gap ? <div className="c-home__gap">
      <span className="c-row__main"><span className="c-row__title c-row__title--b">{gap.title}</span><span className="c-row__detail"><span>{gap.detail}</span></span></span>
      <CorpButtonLink href={gap.href} size="md" aria-label={`Find cover: ${gap.title}, ${gap.detail}`}>Find cover</CorpButtonLink>
    </div> : null}
  </>);
}

/** Payday: the next payday from the pay schedule and the period timecards still to approve. Hidden when there is neither. */
function PaydayCard({ nextPay, timecards }: { nextPay?: NextPay; timecards: ActionItem[] }) {
  if (!nextPay && !timecards.length) return null;
  const when = nextPay ? nextPay.daysUntil <= 0 ? "Payday today" : nextPay.daysUntil === 1 ? "Payday tomorrow"
    : `Payday ${new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(new Date(`${nextPay.payday}T12:00:00Z`))}` : "Timecards to approve";
  const detail = [nextPay?.period ? periodLabel(nextPay.period.startDate, nextPay.period.endDate) : "", timecards.length ? `${count(timecards.length, "timecard", "timecards")} to approve` : "All timecards approved"].filter(Boolean).join(" · ");
  return <CorpCard as="div" ariaLabel="Payday">
    <CorpRow title={when} bold detail={detail} href="/app/timecards" trail={<span className="c-link c-link--l" aria-hidden="true">Review</span>} label={`${when}. ${detail}. Review timecards`} />
  </CorpCard>;
}

/** Things to do: the shared needs-you count, one row per kind; each row opens where the decision is made. */
function ThingsToDo({ value, connection, offline, onRetryActions, setup }: OwnerHomeCorpProps) {
  if (!value) {
    const busy = connection === "loading" || connection === "reconnecting";
    const message = busy ? "Checking what needs you…" : offline || connection === "offline" ? "Updates when you reconnect." : connection === "paused" ? "Updates when you’re back."
      : connection === "access_lost" ? "Sign in again to see what needs you." : "What needs you isn’t available right now.";
    return <CorpCard id="home-needs-you" label="Things to do">
      <CorpBody><p className="c-home__state" aria-busy={busy || undefined}>{message}</p>
        {connection === "access_lost" ? <CorpButtonLink href="/login" kind="secondary" size="md" native>Sign in</CorpButtonLink>
          : !busy && onRetryActions && connection !== "offline" && connection !== "paused" && !offline ? <CorpButton kind="secondary" size="md" onClick={onRetryActions}>Try again</CorpButton> : null}
      </CorpBody>
      {setup}
    </CorpCard>;
  }
  const requests = [...value.now.filter(item => item.category === "requests"), ...value.requests];
  const of = (type: string) => requests.filter(item => item.type === type).length;
  const otherUrgent = value.now.filter(item => item.type !== "COVERAGE_GAP" && item.category !== "requests").length;
  const gaps = value.now.filter(item => item.type === "COVERAGE_GAP").length;
  const rows = [
    { title: "Shifts with no clock-in", n: value.noClockIn.length, href: "/app/inbox#todo-missed" },
    { title: "Open shifts", n: gaps, href: "/app/inbox#todo-open" },
    { title: "Time off requests", n: of("TIME_OFF"), href: "/app/requests" },
    { title: "Shift swaps", n: of("EXCHANGE"), href: "/app/exchange" },
    { title: "Can’t-work reports", n: of("CALLOUT"), href: "/app/inbox#todo-cant-work" },
    { title: "Other urgent items", n: otherUrgent, href: "/app/inbox#todo-now" },
  ].filter(row => row.n > 0);
  return <CorpCard id="home-needs-you" label={`Things to do (${value.count})`} aside={<CorpLink href="/app/inbox" label="See all things to do">See all</CorpLink>}>
    {rows.length ? <CorpRows label="Things to do">
      {rows.map(row => <li key={row.title}><CorpRow title={row.title} href={row.href} one trail={<CorpBadge count={row.n} />} chevron label={`${row.title}, ${row.n}`} /></li>)}
    </CorpRows> : <CorpBody><p className="c-home__state">You’re all set. Nothing needs you right now.</p></CorpBody>}
    {setup}
  </CorpCard>;
}
