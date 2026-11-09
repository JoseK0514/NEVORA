"use client";
import type { ReactNode } from "react";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { CORP_NO_VALUE } from "@/components/corp/corp";
import { periodLabel, type NextPay } from "@/components/payroll/my-pay";
import { gapRow } from "@/components/manager-inbox-corp";
import { itemPerson } from "@/lib/action-center/present";
import type { NeedsYou } from "@/lib/action-center/needs-you";
import type { ActionItem } from "@/lib/action-center/project";
import type { Today, TodayShift } from "@/lib/today/project";
import type { ClockMonitor } from "@/lib/time-clock";
import type { ActionCenterConnection } from "@/components/manager-action-center";
import { compactRange, BAvatar, BButtonLink, BCard, BFaces, BHero, BIcon, BInk, BList, BLive, BRow, BScreen, BStack, partOfDay } from "./b-kit";

/* Direction B, Owner and Manager Home on a phone (mock screen "Owner · Home"). The same reads as the corporate Home: Today's
 * shifts and the clock-in monitor for the live figures, the shared needs-you read for the sentence, the card and the count,
 * My pay's next payday for the Payday tile, and the dashboard's week for This week. Nothing here is estimated or invented:
 * a figure that hasn't arrived is "—", and a card whose data is missing is left out. */

export type HomeBWeek = {
  firstName: string;
  /** Shifts per day this week (Mon–Sun), from the dashboard's schedule read. */
  days: { date: string; weekday: string; shiftCount: number }[];
  /** Scheduled hours this week, summed over the dashboard's per-person hours. */
  scheduledHours: number;
  people: number;
  /** Where Payday's button goes: Payroll for an Owner with payroll, otherwise Timecards. */
  payrollHref?: string;
};

export type HomeBProps = {
  today: Today | null; monitor: ClockMonitor | null; monitorPending: boolean; offline: boolean;
  value: NeedsYou | null; connection: ActionCenterConnection; timecards: ActionItem[]; timecardsReady: boolean; businessDay?: string;
  nextPay?: NextPay; setup?: ReactNode; dateLabel: string; summary: string; week?: HomeBWeek; greeting: string;
};

const working = (shift: TodayShift) => shift.status === "clocked_in" || shift.status === "on_break";
const people = (shifts: TodayShift[]) => new Set(shifts.map(shift => shift.employeeId)).size;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const utc = (date: string) => new Date(`${date}T12:00:00Z`);
const fmt = (date: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...options }).format(utc(date));
const nextDay = (date: string) => new Date(Date.parse(`${date}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
const periodEnd = (item: ActionItem) => { try { return new URL(item.href, "https://nevora.invalid").searchParams.get("end"); } catch { return null; } };
const hoursText = (hours: number) => `${Math.round(hours * 10) / 10} h`;
const firstNames = (names: string[]) => names.length <= 2 ? names.join(", ") : `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
const shortRange = (start: string, end: string) => start === end ? fmt(start, { month: "short", day: "numeric" })
  : start.slice(0, 7) === end.slice(0, 7) ? `${fmt(start, { month: "short", day: "numeric" })}–${Number(end.slice(8))}` : `${fmt(start, { month: "short", day: "numeric" })} – ${fmt(end, { month: "short", day: "numeric" })}`;
const requestKind: Partial<Record<ActionItem["type"], string>> = { TIME_OFF: "Time off request", EXCHANGE: "Shift swap request", CALLOUT: "Can’t-work report" };

export function HomeB(props: HomeBProps) {
  const { today, monitor, monitorPending, value, offline, connection } = props;
  const ready = today?.state === "ready" ? today : null;
  const gaps = value ? value.now.filter(item => item.type === "COVERAGE_GAP") : null;
  const open = monitor?.state === "ready" ? monitor.employees : null;
  const scheduled = ready ? (ready.shifts.length ? people(ready.shifts) : ready.counts.scheduled) : 0;
  const onShift = ready ? (open ? new Set(open.map(person => person.employeeId)).size : people(ready.shifts.filter(working)) || ready.counts.clockedIn) : 0;
  const checking = !ready || (monitorPending && !open && ready.counts.clockedIn > 0);
  const late = value ? value.noClockIn.length : null;
  const first = props.week?.firstName ?? props.greeting.replace(/^Welcome back,\s*/, "");
  const eyebrow = `${partOfDay(ready?.timeZone)}, ${first}`;
  const title = value ? value.count === 0 ? "You’re all set" : `${plural(value.count, "thing needs", "things need")} you`
    : offline ? "You’re offline" : connection === "paused" ? "Paused while you’re away" : "Checking today…";
  const gapRows = ready && gaps ? gaps.map(item => gapRow(item, ready.timeZone, ready.today)) : [];
  const openHref = gaps?.length === 1 && gapRows[0] ? gapRows[0].href : "/app/schedule";

  return <BScreen>
    <BHero big eyebrow={eyebrow} title={title} sub={<><span role="status" className="b-sr">{props.summary}</span></>}>
      <div className="b-hrow"><span className="b-btn b-btn--glass" aria-hidden="true"><CalendarBlankIcon size={15} weight="bold" />{props.dateLabel}</span></div>
      <BLive label="Right now" items={[
        { label: "Clocked in", dot: "live", value: checking ? CORP_NO_VALUE : onShift, small: !checking && scheduled ? `/${scheduled}` : undefined,
          href: checking ? undefined : "/app?view=attendance", aria: checking ? undefined : `Clocked in: ${onShift} of ${scheduled}. Who’s working` },
        { label: "Late", dot: "warn", value: late ?? CORP_NO_VALUE, href: late === null ? undefined : "/app/inbox#todo-missed", aria: late === null ? undefined : `Late: ${late}. Missed clock-ins` },
        { label: "Open shifts", value: gaps ? gaps.length : CORP_NO_VALUE, href: gaps ? openHref : undefined, aria: gaps ? `Open shifts: ${gaps.length}` : undefined },
      ]} />
    </BHero>
    <BStack>
      <NeedsYouCard {...props} gapRows={gapRows} openHref={openHref} />
      <PaydayTile {...props} />
      {props.week ? <ThisWeek week={props.week} today={ready?.today ?? props.businessDay} /> : null}
      {props.setup ? <BCard label="Finish setting up"><div className="b-setup">{props.setup}</div></BCard> : null}
    </BStack>
  </BScreen>;
}

function NeedsYouCard({ value, connection, offline, gapRows, openHref, today }: HomeBProps & { gapRows: ReturnType<typeof gapRow>[]; openHref: string }) {
  if (!value) return <BCard title="Needs you" id="b-home-needs"><p className="b-state" aria-busy={connection === "loading" || connection === "reconnecting" || undefined}>
    {offline || connection === "offline" ? "Updates when you reconnect." : connection === "paused" ? "Updates when you’re back." : connection === "loading" || connection === "reconnecting" ? "Checking what needs you…" : "Things to do isn’t available right now."}</p></BCard>;
  const rows: ReactNode[] = [];
  if (gapRows.length) {
    const next = gapRows[0];
    rows.push(<BRow key="gaps" lead={<BIcon tone="amber"><CalendarBlankIcon weight="bold" /></BIcon>} title={`Cover ${plural(gapRows.length, "open shift", "open shifts")}`}
      sub={`Next: ${/^Today\b/.test(next.detail ?? "") ? "today, " : ""}${compactRange(next.title)}`} href={openHref} label={`Open shifts, ${gapRows.length}`}
      trail={<BButtonLink href={next.href} label={`Find cover: ${next.title}`}>Find cover</BButtonLink>} />);
  }
  if (value.noClockIn.length) {
    const names = value.noClockIn.map(shift => shift.employeeName);
    rows.push(<BRow key="missed" lead={<BFaces names={names} />} title={plural(value.noClockIn.length, "missed clock-in", "missed clock-ins")} sub={firstNames(names)}
      href="/app/inbox#todo-missed" label={`Missed clock-ins: ${names.join(", ")}`} />);
  }
  const requests = [...value.now.filter(item => item.category === "requests"), ...value.requests];
  for (const item of requests.slice(0, Math.max(0, 3 - rows.length))) {
    const person = itemPerson(item);
    const facts = item.request;
    rows.push(<BRow key={item.id} lead={person ? <BAvatar name={person} size={32} /> : <BIcon tone="grey"><CalendarBlankIcon weight="bold" /></BIcon>}
      title={requestKind[item.type] ?? item.title} sub={[person, facts ? shortRange(facts.startDate, facts.endDate) : null].filter(Boolean).join(" · ")}
      href={facts?.reviewHref ?? "/app/inbox#todo-requests"} label={`${requestKind[item.type] ?? item.title}${person ? `, ${person}` : ""}`} />);
  }
  const others = value.now.filter(item => item.type !== "COVERAGE_GAP" && item.category !== "requests");
  if (rows.length < 3 && others.length) rows.push(<BRow key="others" lead={<BIcon tone="grey"><CalendarBlankIcon weight="bold" /></BIcon>}
    title={plural(others.length, "item to review", "items to review")} sub="Time corrections and timecards" href="/app/inbox#todo-review" />);
  return <BCard title="Needs you" count={value.count} id="b-home-needs" link={{ href: "/app/inbox", label: "See all", aria: "See all things to do" }}>
    {rows.length ? <BList label="Needs you">{rows.slice(0, 3)}</BList>
      : <p className="b-state">{today?.state === "unavailable" ? "Clock-ins can’t be checked right now." : "Nothing needs you right now."}</p>}
  </BCard>;
}

/** Payday, as the corporate card says it (R7): the payday, its period, then what to do about timecards and when. It never
 * says "approved" when it can't know, and it never guesses a count while the read is on its way. */
function PaydayTile({ nextPay, timecards, timecardsReady, connection, businessDay, week }: HomeBProps) {
  if (!nextPay) return null;
  const ends = timecards.map(periodEnd);
  const closed = businessDay ? ends.filter(end => end && end < businessDay).length : 0;
  const openEnd = businessDay ? [...ends, nextPay.period?.endDate].filter((end): end is string => !!end && end >= businessDay).sort()[0] : undefined;
  const step = !timecardsReady ? { title: "Timecards", detail: connection === "loading" || connection === "reconnecting" ? "Checking…" : "Not available right now", done: false }
    : closed ? { title: `${plural(closed, "timecard", "timecards")} to review`, detail: "Ready now", done: false }
    : openEnd ? { title: "Approve timecards", detail: `From ${fmt(nextDay(openEnd), { weekday: "short", month: "short", day: "numeric" })}`, done: false }
    : { title: "Timecards", detail: "None waiting", done: true };
  const away = nextPay.daysUntil <= 0 ? "Today" : nextPay.daysUntil === 1 ? "Tomorrow" : `In ${nextPay.daysUntil} days`;
  const href = week?.payrollHref ?? "/app/timecards";
  return <BInk label="Payday">
    <div className="b-ink__top"><span className="b-ink__k">Payday</span><span className={closed ? "b-ink__due" : "b-ink__due b-ink__due--ok"}>{away}</span></div>
    <div className="b-ink__big">{fmt(nextPay.payday, { weekday: "long", month: "short", day: "numeric" })}</div>
    {nextPay.period ? <div className="b-ink__m">Pay period {periodLabel(nextPay.period.startDate, nextPay.period.endDate)}</div> : null}
    <div className="b-ink__segs" aria-hidden="true"><i className={step.done ? "on" : ""} /><i /><i /></div>
    <div className="b-ink__r2"><span>{step.title}</span><span>{step.detail}</span></div>
    <BButtonLink href={href} kind="white" full label={href === "/app/payroll" ? "Prepare payroll" : "Open timecards"}>{href === "/app/payroll" ? "Prepare payroll" : "Open timecards"}</BButtonLink>
  </BInk>;
}

/** This week: scheduled hours and people from the dashboard's read, and each day's shifts as a bar (today in teal). */
function ThisWeek({ week, today }: { week: HomeBWeek; today?: string }) {
  const max = Math.max(1, ...week.days.map(day => day.shiftCount));
  const shifts = week.days.reduce((total, day) => total + day.shiftCount, 0);
  return <BCard title="This week" link={{ href: "/app/schedule", label: "Schedule" }}>
    <div className="b-kv">
      <div><b className="c-num">{hoursText(week.scheduledHours)}</b><span>Scheduled</span></div>
      <div><b className="c-num">{shifts}</b><span>{shifts === 1 ? "Shift" : "Shifts"}</span></div>
      <div><b className="c-num">{week.people}</b><span>{week.people === 1 ? "Person" : "People"}</span></div>
    </div>
    {week.days.length === 7 ? <>
      <div className="b-days" role="img" aria-label={`Shifts per day: ${week.days.map(day => `${day.weekday} ${day.shiftCount}`).join(", ")}`}>
        {week.days.map(day => <i key={day.date} className={day.date === today ? "today" : undefined} style={{ height: `${Math.max(6, Math.round(day.shiftCount / max * 100))}%` }} />)}
      </div>
      <div className="b-days-l" aria-hidden="true">{week.days.map(day => <span key={day.date}>{day.weekday.slice(0, 1)}</span>)}</div>
    </> : null}
  </BCard>;
}

