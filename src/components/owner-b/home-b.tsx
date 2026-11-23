"use client";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { dateRange, durationTotal } from "@/lib/duration-format";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { ClockUserIcon } from "@phosphor-icons/react/dist/ssr/ClockUser";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/ssr/PencilSimple";
import { ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
import { CalendarPlusIcon } from "@phosphor-icons/react/dist/ssr/CalendarPlus";
import { CalendarMinusIcon } from "@phosphor-icons/react/dist/ssr/CalendarMinus";
import { UserPlusIcon } from "@phosphor-icons/react/dist/ssr/UserPlus";
import { MegaphoneIcon } from "@phosphor-icons/react/dist/ssr/Megaphone";
import { CORP_NO_VALUE } from "@/components/corp/corp";
import { percentText } from "@/components/coverage-minutes/coverage-minutes";
import type { CoverageMinutes, MinuteObligation } from "@/lib/scheduling/coverage-minutes";
import { periodLabel, type NextPay } from "@/components/payroll/my-pay";
import { gapRow } from "@/components/manager-inbox-corp";
import { ATTENDANCE_WORDS, itemPerson, presentItem, splitNoClockIn } from "@/lib/action-center/present";
import { isStaffingRepair, minutesText, repairWhen } from "@/lib/time-off-staffing/present";
import { actionCenterNavigation } from "@/components/action-center-navigation";
import type { NeedsYou } from "@/lib/action-center/needs-you";
import { needsYouTotal, paydayReview } from "@/lib/action-center/review-routing";
import { lateText } from "@/lib/action-center/request-details";
import { reviewCopy } from "@/components/review-details/copy";
import { Explain } from "@/components/review-details/explain";
import type { ActionItem } from "@/lib/action-center/project";
import type { Today, TodayShift } from "@/lib/today/project";
import type { ClockMonitor, ClockMonitorEmployee } from "@/lib/time-clock";
import type { ActionCenterConnection } from "@/components/manager-action-center";
import { HomeSetupProgress } from "@/components/owner-setup-card";
import type { HomePayrollStatus } from "@/lib/payroll/backlog-read";
import { payDay, periodRange } from "@/components/payroll/payroll-format";
import { keepWhole } from "@/lib/keep-whole";
import { formatClockTime, wholeTime } from "@/lib/date-utils";
import { workCopy } from "@/components/employee-b/work-copy";
import { notClockedInText } from "@/components/team-live";
import { BAvatar, BButtonLink, BCard, BChip, BFaces, BGlyph, BHero, BIcon, BInk, BList, BLive, BRow, BScreen, BStack, BState, BStatusText, BSwapNames, BWhen, partOfDay, type BLiveItem } from "./b-kit";

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
  /** Nov 9, 2026: canonical coverage minutes for the week (schedule health), staffing, positions and lead apart. */
  coverage?: CoverageMinutes;
  /** Final polish (Nov 20, 2026): Home's shortcuts, the pages this person may open (the caller leaves out a module that is off). */
  shortcuts?: HomeShortcut[];
  /** Location Manager (Nov 22, 2026): the place this Home is limited to, on the band beside the date (a location menu
   * when the Manager has more than one). Company-wide Homes have none. */
  place?: ReactNode;
  /** False when the week's schedule couldn't be read: This week is left out rather than drawn with zeros. */
  thisWeek?: false;
  /** Gaps G41 (Nov 23, 2026): Who's working for the place this Home shows (a location Manager's chosen place keeps its
   * `?location=`). Defaults to the company view. */
  attendanceHref?: string;
};

export type HomeShortcut = "shift" | "employee" | "update" | "timeOff";
const SHORTCUTS: Record<HomeShortcut, { href: string; label: string; icon: ReactNode }> = {
  shift: { href: "/app/schedule/new", label: "Add shift", icon: <CalendarPlusIcon weight="bold" /> },
  employee: { href: "/app/employees/new", label: "Add employee", icon: <UserPlusIcon weight="bold" /> },
  update: { href: "/app/updates/compose", label: "Send update", icon: <MegaphoneIcon weight="bold" /> },
  timeOff: { href: "/app/requests", label: "Time off", icon: <CalendarMinusIcon weight="bold" /> },
};

/** Home's shortcuts: the same four links on the band (desktop, glass) and as tiles under Things to do (phones and
 * tablets). Only one of the two is displayed at a width (owner-b-home.css), so each is said once. */
function Shortcuts({ items, place }: { items: HomeShortcut[]; place: "band" | "stack" }) {
  if (!items.length) return null;
  return <nav className={`b-qa b-qa--${place}`} aria-label="Shortcuts"><ul>
    {items.map(key => <li key={key}><Link className="b-qa__a" href={SHORTCUTS[key].href}><span className="b-qa__ic" aria-hidden="true">{SHORTCUTS[key].icon}</span><span className="b-qa__l">{SHORTCUTS[key].label}</span></Link></li>)}
  </ul></nav>;
}

export type HomeBProps = {
  today: Today | null; monitor: ClockMonitor | null; monitorPending: boolean; offline: boolean;
  value: NeedsYou | null; connection: ActionCenterConnection; timecards: ActionItem[]; timecardsReady: boolean; businessDay?: string;
  nextPay?: NextPay; setup?: ReactNode; setupCard?: boolean; billing?: ReactNode; dateLabel: string; summary: string; week?: HomeBWeek; greeting: string;
  /** Phase 8 (a.md #5): the Owner's payroll preparation facts Home already reads (the oldest period whose scheduled
   * payday passed with no payroll, a schedule that needs review), so Home never looks calm while Payroll is red. */
  payrollStatus?: HomePayrollStatus | null;
  /** Closing F1 (NV-123): Things to do's fresh read, for the failed card's Try again. */
  onRetry?: () => void;
};

/** Closing F1 (NV-095): Things to do shows up to six rows; below 1024px the card keeps three (owner-home-corp.css). */
const NEEDS_ROWS = 6;

const working = (shift: TodayShift) => shift.status === "clocked_in" || shift.status === "on_break";
const people = (shifts: TodayShift[]) => new Set(shifts.map(shift => shift.employeeId)).size;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const utc = (date: string) => new Date(`${date}T12:00:00Z`);
const fmt = (date: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...options }).format(utc(date));
const t = reviewCopy();
const nextDay = (date: string) => new Date(Date.parse(`${date}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
// Review B7 (NV-068): a period total is whole hours ("511 h"), through the shared formatter.
const hoursText = (hours: number) => durationTotal(hours * 60).replace(" ", "\u00a0");
const firstNames = (names: string[]) => names.length <= 2 ? names.join(", ") : `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
const shortRange = (start: string, end: string) => dateRange(start, end, { year: "never" });
const requestKind: Partial<Record<ActionItem["type"], string>> = { TIME_OFF: "Time-off request", EXCHANGE: "Shift request", CALLOUT: "Can’t-work request" };
// Phase 3 (OW-002): a request row's title is the person; the line under it says the kind and the dates.
const requestWord: Partial<Record<ActionItem["type"], string>> = { TIME_OFF: "Time off", EXCHANGE: "Shift swap", CALLOUT: "Can’t work" };
/** Phase 4 (U09): a shift request says what it is from the typed kind; a cover request is never called a swap. */
const kindWord = (item: ActionItem) => item.type === "EXCHANGE" && item.request?.exchangeKind === "COVERAGE" ? t.coverRequest : requestWord[item.type];
/** Phase 3 (MG-011): On now shows up to six people. */
const ON_NOW_ROWS = 6;
/** "7:02 AM", kept whole (the one time format). */
const clockText = (iso: string, timeZone: string) => wholeTime(formatClockTime(iso, timeZone));
/** Phase 8 (a.md #11, #36): Team's live word, and Employee Home's sentence for a punch that runs past the shift's end. */
const CLOCKED_IN = "Clocked in";
const stillOn = (time: string | null) => time ? workCopy().stillClockedIn(time) : "Still clocked in";

export function HomeB(props: HomeBProps) {
  const { today, monitor, monitorPending, value, offline, connection } = props;
  const ready = today?.state === "ready" ? today : null;
  const gaps = value ? value.now.filter(item => item.type === "COVERAGE_GAP") : null;
  const open = monitor?.state === "ready" ? monitor.employees : null;
  const scheduled = ready ? (ready.shifts.length ? people(ready.shifts) : ready.counts.scheduled) : 0;
  const onShift = ready ? (open ? new Set(open.map(person => person.employeeId)).size : people(ready.shifts.filter(working)) || ready.counts.clockedIn) : 0;
  const checking = !ready || (monitorPending && !open && ready.counts.clockedIn > 0);
  // Jose's attendance words (Nov 11, 2026): a shift in progress with no punch is "Not clocked in"; "Missed" is only a shift
  // that ended with no punch. The tile is the live figure, so it reads "Missed" only when nobody is waiting to clock in.
  const noClockIn = value ? splitNoClockIn(value.noClockIn) : null;
  const missedOnly = !!noClockIn && !noClockIn.running.length && noClockIn.ended.length > 0;
  // Phase 4 (U03): with today's clock-ins unread the figure is unknown ("—"), never a zero. Phase 8 (a.md #16): someone
  // waiting to clock in is the amber dot, as an open shift is; on narrow phones the dots sit beside the figures instead
  // (owner-b-home.css), so the label keeps its one line.
  const attendance: BLiveItem = !noClockIn || today?.state === "unavailable" ? { label: ATTENDANCE_WORDS.notClockedIn, value: CORP_NO_VALUE }
    // Gaps G39 (Nov 23, 2026): a tile's spoken name is what it shows ("Missed 2"), with no label that says it differently.
    : missedOnly ? { label: ATTENDANCE_WORDS.missed, dot: "warn", value: noClockIn.ended.length, href: "/app/inbox#todo-missed" }
    : { label: ATTENDANCE_WORDS.notClockedIn, dot: noClockIn.running.length ? "warn" : undefined, value: noClockIn.running.length, href: "/app/inbox#todo-not-clocked-in" };
  // BR-16 with the backend's clockerRegistered (Nov 15, 2026): while no time clock tablet is registered, the two attendance
  // tiles would report punches that can't happen yet, so one tile says the time clock isn't set up. Registration is a
  // stored fact, not proof that punching is on, so a registered tablet changes nothing here. Unknown keeps the tiles.
  // Only an Owner's Home carries the setup card, so only an Owner's tile links to the time clock settings.
  // Gaps G38 (Nov 23, 2026): people can clock in without a tablet (on their phone), so once anyone has clocked in today the
  // band shows the live figures; "Not set up" would contradict Today's list.
  const clockedInToday = !!ready && (ready.shifts.some(shift => shift.firstClockInAt || working(shift) || shift.status === "done") || !!open?.length || ready.counts.clockedIn > 0);
  const noClock = ready?.clockerRegistered === false && !clockedInToday;
  const clockTile: BLiveItem = { label: "Time clock", value: "Not set up", ...(props.setup ? { href: "/app/settings/clocker" } : {}) };
  const attendanceHref = props.week?.attendanceHref ?? "/app?view=attendance";
  const first = props.week?.firstName ?? props.greeting.replace(/^Welcome back,\s*/, "");
  const eyebrow = `${partOfDay(ready?.timeZone)}, ${first}`;
  // Phase 4 (U03): the count with its completeness. With today's clock-ins unread (or review facts missing) the count is
  // a lower bound: the title says "At least N", and a zero is never "You’re all set".
  const total = value ? needsYouTotal(value, { clockInsUnavailable: today?.state === "unavailable" }) : null;
  const title = value && total ? value.count === 0 ? total.exact ? "You’re all set" : t.notAllChecked : t.needYou(value.count, total.exact)
    : offline ? "You’re offline" : connection === "paused" ? "Paused while you’re away" : "Checking today…";
  const gapRows = ready && gaps ? gaps.map(item => gapRow(item, ready.timeZone, ready.today)) : [];
  const openHref = gaps?.length === 1 && gapRows[0] ? gapRows[0].href : "/app/schedule";
  // Gaps G73 (Nov 23, 2026): while Things to do (and the Timecards facts that come with it) is still being read, the
  // cards that would sit below it wait, so its growth from the loading line moves nothing (phones) and the Timecards
  // tile doesn't switch content mid-load (desktop). A failed or offline read releases them at once.
  const overduePay = props.payrollStatus?.state === "ready" && !!props.payrollStatus.overdue;
  const holdBelow = (connection === "loading" || connection === "reconnecting") && (!value || !props.timecardsReady);

  return <BScreen>
    <BHero big eyebrow={eyebrow} title={title} offlineInTitle={!value && offline} sub={<><span role="status" className="b-sr">{props.summary}</span></>}>
      {/* Review B1 (NV-117): the date is a fact on the band, not a glass button. */}
      <div className="b-hrow"><span className="b-date" aria-hidden="true"><CalendarBlankIcon size={15} weight="bold" />{props.dateLabel}</span>{props.week?.place ?? null}</div>
      <div className="b-home-strip">
      <BLive label="Right now" items={[
        ...(noClock ? [clockTile] : [{ label: "Clocked in", dot: "live" as const, value: checking ? CORP_NO_VALUE : onShift, small: !checking && scheduled ? `/${scheduled}` : undefined,
          href: checking ? undefined : attendanceHref },
        attendance]),
        { label: "Open shifts", dot: gaps?.length ? "warn" : undefined, value: gaps ? gaps.length : CORP_NO_VALUE, href: gaps ? openHref : undefined },
      ]} />
      {props.week?.shortcuts ? <Shortcuts items={props.week.shortcuts} place="band" /> : null}
      </div>
    </BHero>
    <BStack>
      {/* Phase 3 (OW-031, MG-011): two columns on desktop, each stacking on its own, so neither leaves a hole under the
        other: what to do and who is on now at the left, Payday and This week at the right. On phones and tablets the
        two wrappers have no box (owner-b-home.css) and the cards stack in this order. */}
      <div className="b-home-col b-home-col--a">
        {/* QA A5-01 (Nov 23, 2026): on phones a payroll that is overdue is the first card under the band, before Things to
          * do (the Owner's one main action, "Prepare <period>"). Payroll status comes with the page, so it is never held
          * for Things to do's read and nothing moves when that arrives (G73). From 768 the same card leads the right
          * column as before (owner-b-home.css shows one copy per width). */}
        {overduePay ? <div className="b-home-payfirst"><PayrollNotice status={props.payrollStatus} /></div> : null}
        {/* Nov 14, 2026 inspection (BR-16): until setup is done its card leads the page (the card hides itself once the
          steps are complete), so a new workplace sees what to finish before the day's figures. */}
        {/* Backend (Nov 15, 2026): the Owner's plan and billing notice leads while it applies. */}
        {props.billing ?? null}
        {/* SCRUM-218 (Nov 19, 2026): the Owner's setup slot is the first-week card, a whole card of its own with its own
          read; the older setup rows (the preview) keep their "Finish setting up" card. */}
        {props.setupCard ? props.setup
          : props.setup ? <BCard label="Finish setting up"><div className="b-setup"><HomeSetupProgress.Provider value={ready?.setupProgress ?? null}>{props.setup}</HomeSetupProgress.Provider></div></BCard> : null}
        <NeedsYouCard {...props} gapRows={gapRows} openHref={openHref} />
        {props.week?.shortcuts && !holdBelow ? <Shortcuts items={props.week.shortcuts} place="stack" /> : null}
        {/* Jose (Nov 22, 2026: no fact twice): once Things to do lists who hasn't clocked in, Today doesn't list them again.
          Gaps G56 (Nov 23, 2026): while Things to do's read is on its way, Today waits for it, so it doesn't list those
          people, then drop them and move. A read that failed (or offline) keeps them on Today. */}
        {ready && (value || (connection !== "loading" && connection !== "reconnecting")) ? <OnNow shifts={ready.shifts} open={open} timeZone={ready.timeZone} observedAt={ready.observedAt} waitingListed={!!value} attendanceHref={attendanceHref} /> : null}
      </div>
      <div className="b-home-col b-home-col--b">
        {holdBelow ? null : <>
        {overduePay ? <div className="b-home-paylate"><PayrollNotice status={props.payrollStatus} /></div> : <PayrollNotice status={props.payrollStatus} />}
        <PaydayTile {...props} />
        {props.week && props.week.thisWeek !== false ? <ThisWeek week={props.week} today={ready?.today ?? props.businessDay} /> : null}
        </>}
      </div>
    </BStack>
  </BScreen>;
}

function NeedsYouCard({ value, connection, offline, gapRows, openHref, today, onRetry }: HomeBProps & { gapRows: ReturnType<typeof gapRow>[]; openHref: string }) {
  const failed = !value && !offline && (connection === "unavailable" || connection === "ready");
  // Closing F1 (NV-123, NV-075): a failed read is the kit's state card with its one way forward (Try again).
  if (failed) return <BCard title="Things to do" id="b-home-needs"><BState kind="failed" title="Things to do didn’t load" line="Check your connection, then try again."
    action={onRetry ? { label: "Try again", onClick: onRetry } : undefined} /></BCard>;
  if (!value) return <BCard title="Things to do" id="b-home-needs"><p className="b-state" aria-busy={connection === "loading" || connection === "reconnecting" || undefined}>
    {offline || connection === "offline" ? "Updates when you reconnect." : connection === "paused" ? "Updates when you’re back." : connection === "access_lost" ? "Sign in again to see what needs you." : connection === "not_allowed" ? "You don’t have access to Things to do. Ask the Owner if you need it." : "Checking what needs you…"}</p></BCard>;
  const rows: ReactNode[] = [];
  if (gapRows.length) {
    const next = gapRows[0];
    // Phase 8 (b.md #46): a row's button is the tinted pill, as on Things to do; the filled teal stays the page's one main action.
    rows.push(<BRow key="gaps" lead={<BIcon tone="amber"><CalendarBlankIcon weight="bold" /></BIcon>} title={gapRows.length === 1 ? "Cover an open shift" : "Cover open shifts"}
      sub={<>{`Next: ${/^Today\b/.test(next.detail ?? "") ? "today, " : ""}`}<BWhen text={next.title} /></>} href={openHref}
      trail={<BButtonLink href={next.href} kind="ghost" label={`Find cover: ${next.title}`}>Find cover</BButtonLink>} />);
  }
  // Nov 9, 2026: approved leave over a published shift: "Fill Maria Rivera’s shift" (one) or "Fill 2 shifts for approved
  // leave", opening the schedule with the person and the repair (or Things to do's Shifts to fill for several).
  const repairs = value.now.filter(isStaffingRepair);
  if (repairs.length) {
    const first = repairs[0], shown = presentItem(first, "Fill shift");
    rows.push(<BRow key="repairs" lead={<BIcon tone="amber"><CalendarBlankIcon weight="bold" /></BIcon>}
      title={repairs.length === 1 ? shown.title : `Fill ${plural(repairs.length, "shift", "shifts")} for approved time off`}
      sub={repairs.length === 1 ? repairWhen(first) : `Next: ${shown.title.replace(/^Fill /, "")}`} href={repairs.length === 1 ? actionCenterNavigation(first).href : "/app/inbox#todo-repair"}
      label={repairs.length === 1 ? `${shown.title}, ${repairWhen(first)}` : `Shifts to fill for approved time off, ${repairs.length}`} />);
  }
  // One row for shifts in progress with no punch ("Not clocked in") and one for shifts that ended with none ("Missed").
  // Gaps G39 (Nov 23, 2026): these rows, the corrections row and the request rows are named by what they show (no
  // aria-label that orders or words it differently).
  // Phase 8 (a.md #13): the row's title is the person (or the people); the line under it says what and when, in Jose's
  // attendance words, with the shift's start or end when it is one person.
  const noClockIn = splitNoClockIn(value.noClockIn);
  const zone = today?.state === "ready" ? today.timeZone : undefined;
  // Each part of the line stays whole ("shift ended", "11:30 PM"), so a narrow phone or 200% text breaks only after " · "
  // or before the time, never inside it (one time format, Nov 23, 2026).
  const at = (iso: string) => zone ? clockText(iso, zone).replace(" ", "\u00a0") : null;
  const whole = (text: string) => text.replace(/ /g, "\u00a0");
  if (noClockIn.running.length) {
    const names = noClockIn.running.map(shift => shift.employeeName), began = noClockIn.running.length === 1 ? at(noClockIn.running[0].startAt) : null;
    // Premium pass FA (final verification A #19, B #25): a row that names several people leads with what they share, the
    // amber attendance circle (a person and a clock), not the first person's face alone; one person keeps their face.
    rows.push(<BRow key="not-clocked-in" lead={names.length > 1 ? <BIcon tone="amber"><ClockUserIcon weight="bold" /></BIcon> : <BAvatar name={names[0]} ring="late" />} title={firstNames(names)}
      sub={noClockIn.running.length > 1 ? `${ATTENDANCE_WORDS.notClockedIn} \u00b7 ${noClockIn.running.length}\u00a0people` : began ? `${ATTENDANCE_WORDS.notClockedIn}\u00a0\u00b7 ${`${whole("shift began")} ${began}`}` : ATTENDANCE_WORDS.notClockedIn}
      href="/app/inbox#todo-not-clocked-in" />);
  }
  if (noClockIn.ended.length) {
    const names = noClockIn.ended.map(shift => shift.employeeName), ended = noClockIn.ended.length === 1 ? at(noClockIn.ended[0].endAt) : null;
    rows.push(<BRow key="missed" lead={names.length > 1 ? <BIcon tone="amber"><ClockUserIcon weight="bold" /></BIcon> : <BAvatar name={names[0]} ring="late" />} title={firstNames(names)}
      sub={noClockIn.ended.length > 1 ? plural(noClockIn.ended.length, "missed clock-in", "missed clock-ins") : ended ? `Missed clock-in\u00a0\u00b7 ${`${whole("shift ended")} ${ended}`}` : "Missed clock-in"}
      href="/app/inbox#todo-missed" />);
  }
  // Phase 3 (MG-005): corrections that wait on this person are part of the count, so they have their row here.
  // Premium pass FA (coordinator, with FC): fixing time is the pencil on every page and for every role.
  if (value.corrections.length) {
    const names = value.corrections.map(item => item.detail.split(" · ")[0]?.trim()).filter((name): name is string => !!name);
    rows.push(<BRow key="corrections" lead={<BIcon tone="amber"><PencilSimpleIcon weight="bold" /></BIcon>} title={plural(value.corrections.length, "time correction", "time corrections")}
      sub={firstNames(names)} href="/app/inbox#todo-corrections" />);
  }
  const requests = [...value.now.filter(item => item.category === "requests"), ...value.requests];
  for (const item of requests.slice(0, Math.max(0, NEEDS_ROWS - rows.length))) {
    const person = itemPerson(item);
    const facts = item.request;
    // Nov 14, 2026 inspection (BR-7): a shift request names both people when the read carries the other one. Phase 3
    // (OW-002, OW-007): the person is the title, the kind and the dates are the line under it, and every lead is 36px.
    const who = person && facts?.counterpartName ? <BSwapNames a={person} b={facts.counterpartName} /> : person;
    const kind = kindWord(item);
    rows.push(<BRow key={item.id} lead={person ? <BAvatar name={person} /> : <BIcon tone="amber"><CalendarBlankIcon weight="bold" /></BIcon>}
      title={who ?? requestKind[item.type] ?? item.title} sub={[who ? kind : null, facts ? shortRange(facts.startDate, facts.endDate) : null].filter(Boolean).join(" · ") || undefined}
      href={facts?.reviewHref ?? "/app/inbox#todo-requests"} />);
  }
  const others = value.now.filter(item => item.type !== "COVERAGE_GAP" && item.category !== "requests" && !isStaffingRepair(item));
  // Phase 9 (spec 3.2): these wait on this person, so the circle is amber, with the timecards' Clock (it was a grey calendar).
  if (rows.length < NEEDS_ROWS && others.length) rows.push(<BRow key="others" lead={<BIcon tone="amber"><ClockIcon weight="bold" /></BIcon>}
    title={plural(others.length, "item to review", "items to review")} sub="Time corrections and timecards" href="/app/inbox#todo-review" />);
  // Phase 4 (U03): an empty card with a source unread says what could not be checked instead of "Nothing needs you".
  // Jose (Nov 22, 2026: no fact twice): the band's title already says how many things need you ("At least N" when it is
  // a lower bound), so the card carries no count pill; the open-shift row's count is the band's Open shifts figure.
  const total = needsYouTotal(value, { clockInsUnavailable: today?.state === "unavailable" });
  return <BCard title="Things to do" id="b-home-needs" link={{ href: "/app/inbox", label: "See all", aria: "See all things to do" }}>
    {rows.length ? <BList label="Things to do">{rows.slice(0, NEEDS_ROWS)}</BList>
      : <p className="b-state">{total.clockInsUnchecked ? "Clock-ins can’t be checked right now." : total.exact ? "Nothing needs you right now." : t.notAllCheckedLine}</p>}
    {rows.length && !total.exact ? <p className="b-card__note b-home-partial" role="note">{total.clockInsUnchecked ? t.clockInsUnchecked : t.correctionsUnchecked(total.uncheckedReviews)}</p> : null}
  </BCard>;
}

/** Phase 3 (MG-011, OW-031): who is working right now, from Today's shifts (the read Home already has). People on the
 * clock first (a late arrival says so in Jose's words), then people whose shift began with no clock-in. No estimate: a
 * shift that hasn't started isn't listed, and when nobody is on the card says so and names the next start. */
function OnNow({ shifts, open, timeZone, observedAt, waitingListed = false, attendanceHref = "/app?view=attendance" }: { shifts: TodayShift[]; open: ClockMonitorEmployee[] | null; timeZone: string; observedAt: string; waitingListed?: boolean; attendanceHref?: string }) {
  const byStart = (a: TodayShift, b: TodayShift) => a.startAt.localeCompare(b.startAt) || a.employeeName.localeCompare(b.employeeName);
  const seen = new Set<string>();
  const once = (shift: TodayShift) => seen.has(shift.employeeId) ? false : (seen.add(shift.employeeId), true);
  const on = [...shifts.filter(working).sort(byStart), ...(waitingListed ? [] : shifts.filter(shift => shift.status === "not_clocked_in").sort(byStart))].filter(once);
  // A real clock-in can have no scheduled match. Keep that person visible, with the actual start only;
  // a matching Today row remains the single row for that person. Retired monitor data supplies no extras.
  const extra = (open ?? []).filter(person => !seen.has(person.employeeId)).filter(person => (seen.add(person.employeeId), true))
    .sort((a, b) => a.clockInAt.localeCompare(b.clockInAt) || a.employeeName.localeCompare(b.employeeName));
  const total = on.length + extra.length;
  const next = shifts.filter(shift => shift.status === "upcoming" || shift.status === "starting").sort(byStart)[0];
  // A row names its place only when the card shows more than one (a single place is named once, on the band or nowhere).
  const places = new Set([...shifts.map(shift => shift.locationName), ...(open ?? []).map(person => person.locationName)]).size > 1;
  const onClock = [...on.filter(working).map(shift => shift.employeeName), ...extra.map(person => person.employeeName)];
  return <BCard title="Today" id="b-home-on" link={{ href: attendanceHref, label: "See everyone", aria: "See everyone working today" }}>
    <DayChart shifts={shifts} timeZone={timeZone} observedAt={observedAt} />
    {/* Phones: the people on the clock are one row of faces that opens the list of everyone; from 768px each has a row. */}
    {onClock.length ? <div className="b-tdy-faces"><BList label="Clocked in now"><BRow lead={<BFaces names={onClock.slice(0, 4)} />} title={`${onClock.length} clocked in`}
      sub={firstNames(onClock.map(name => name.split(" ")[0]))}
      href={attendanceHref} /></BList></div> : null}
    {total ? <BList label="On now">{[...on.map(shift => {
      const waiting = shift.status === "not_clocked_in";
      // Phase 8 (a.md #36): someone still on the clock after their shift ended says so in amber, in the words Employee
      // Home uses ("Still clocked in since 9:02 AM"); that matters more than how late they arrived.
      const over = shift.status === "clocked_in" && Date.parse(observedAt) > Date.parse(shift.endAt);
      // Phase 9 (spec 3.1): the normal states are quiet grey words ("Clocked in" with the green live dot, "On break"); only
      // an exception is a chip, amber with the live dot, and "Not clocked in" says for how long, as Team does.
      const exception = waiting ? notClockedInText(Math.floor((Date.parse(observedAt) - Date.parse(shift.startAt)) / 60_000))
        : over ? (shift.firstClockInAt ? stillOn(clockText(shift.firstClockInAt, timeZone)) : stillOn(null))
        : shift.status !== "on_break" && shift.late ? lateText(shift, ATTENDANCE_WORDS.late, t) : null;
      const state = exception ?? (shift.status === "on_break" ? "On break" : CLOCKED_IN);
      const when = `${clockText(shift.startAt, timeZone)} – ${clockText(shift.endAt, timeZone)}`;
      return <BRow key={shift.id} lead={<BAvatar name={shift.employeeName} ring={waiting || shift.late || over ? "late" : "on"} />} title={shift.employeeName}
        sub={keepWhole(places ? `${when} · ${shift.locationName}` : when)}
        end={exception ? <BChip tone="amber" dot>{exception}</BChip> : <BStatusText dot={shift.status === "on_break" ? undefined : "green"}>{state}</BStatusText>}
        label={`${shift.employeeName}, ${state}, ${when}${places ? `, ${shift.locationName}` : ""}`} />;
    }), ...extra.map(person => <BRow key={`clock:${person.timeEntryId}`} lead={<BAvatar name={person.employeeName} ring="on" />} title={person.employeeName}
      // Jose (Nov 22, 2026: no wording twice): the row's status already says "Clocked in", so the line says since when
      // (Who's working's words).
      sub={keepWhole(places ? `In since ${clockText(person.clockInAt, timeZone)} · ${person.locationName}` : `In since ${clockText(person.clockInAt, timeZone)}`)}
      end={<BStatusText dot={person.state === "ON_BREAK" ? undefined : "green"}>{person.state === "ON_BREAK" ? "On break" : CLOCKED_IN}</BStatusText>} />)].slice(0, ON_NOW_ROWS)}</BList>
      : <p className="b-state">{next ? `Nobody is working right now. Next shift starts ${clockText(next.startAt, timeZone)}.` : "Nobody is working right now."}</p>}
    {/* Premium pass FA (final verification A #22, B #25): the people the card leaves out are one teal action to the list of
      * everyone, on the rows' text edge (it was grey "+1 more" text that did nothing). */}
    {total > ON_NOW_ROWS ? <Link className="b-on-more" href={attendanceHref} aria-label={`See ${total - ON_NOW_ROWS} more working today`}>{`See ${total - ON_NOW_ROWS} more`}</Link> : null}
  </BCard>;
}

/** Final polish (Nov 20, 2026): today's schedule as one picture. Each bar is one hour of the day and its height is how
 * many people the published schedule has working in that hour; hours already past are grey, the current hour is teal.
 * Three figures above it: people scheduled today, their scheduled hours, and the most people on at once. Everything is
 * counted from Today's shifts (the read Home already has): nothing is estimated, and a day with no shifts draws nothing. */
const HOUR = 3_600_000;
export function dayHours(shifts: TodayShift[], observedAt: string) {
  const spans = shifts.map(shift => ({ id: shift.employeeId, start: Date.parse(shift.startAt), end: Date.parse(shift.endAt) })).filter(span => Number.isFinite(span.start) && span.end > span.start);
  if (!spans.length) return null;
  const from = Math.floor(Math.min(...spans.map(span => span.start)) / HOUR) * HOUR;
  const until = Math.min(from + 24 * HOUR, Math.ceil(Math.max(...spans.map(span => span.end)) / HOUR) * HOUR);
  const now = Date.parse(observedAt);
  const hours = Array.from({ length: Math.round((until - from) / HOUR) }, (_, index) => {
    const at = from + index * HOUR;
    return { at, people: new Set(spans.filter(span => span.start < at + HOUR && span.end > at).map(span => span.id)).size, state: now >= at + HOUR ? "past" as const : now >= at ? "now" as const : "next" as const };
  });
  const peak = hours.reduce((best, hour) => hour.people > best.people ? hour : best, hours[0]);
  return { hours, peak, people: new Set(spans.map(span => span.id)).size, minutes: Math.round(spans.reduce((total, span) => total + (span.end - span.start), 0) / 60_000) };
}

function DayChart({ shifts, timeZone, observedAt }: { shifts: TodayShift[]; timeZone: string; observedAt: string }) {
  const day = dayHours(shifts, observedAt);
  if (!day) return null;
  // The one time format (Nov 23, 2026): "7:00 AM", kept whole (it was "7 AM").
  const hourText = (at: number) => keepWhole(formatClockTime(at, timeZone));
  const max = Math.max(1, day.peak.people);
  // A label under the first hour, then every fourth (every fifth on a long day), so the labels never touch. Nov 23, 2026:
  // the one time format ("11:00 AM") is about three bars wide on a 320px phone, so the three hours either side of "Now"
  // and the last three bars carry none.
  const every = day.hours.length > 15 ? 5 : 4;
  const nowAt = day.hours.findIndex(hour => hour.state === "now");
  return <div className="b-tdy">
    <div className="b-kv">
      <div><b className="c-num">{day.people}</b><span>{day.people === 1 ? "Person" : "People"}</span></div>
      <div><b className="c-num">{durationTotal(day.minutes).replace(" ", "\u00a0")}</b><span>Scheduled</span></div>
      <div><b className="c-num">{day.peak.people}</b><span>{`Peak, ${hourText(day.peak.at)}`}</span></div>
    </div>
    <p className="b-days-cap">People scheduled by hour</p>
    <div className="b-tdy-bars" role="img" style={{ "--n": day.hours.length } as CSSProperties}
      aria-label={`People scheduled by hour: ${day.hours.map(hour => `${hourText(hour.at)} ${hour.people}`).join(", ")}`}>
      {day.hours.map((hour, index) => <i key={hour.at} data-state={hour.state} style={{ height: `${Math.max(6, Math.round(hour.people / max * 100))}%`, "--i": index } as CSSProperties} />)}
    </div>
    <div className="b-tdy-l" aria-hidden="true" style={{ "--n": day.hours.length } as CSSProperties}>
      {day.hours.map((hour, index) => <span key={hour.at} data-state={hour.state}>{hour.state === "now" ? "Now"
        : index % every === 0 && index < day.hours.length - 3 && (nowAt < 0 || Math.abs(index - nowAt) > 3) ? hourText(hour.at) : ""}</span>)}
    </div>
  </div>;
}

/** Phase 8 (a.md #5): what Payroll says in red, said on Home in Payroll's own words, from the preparation facts Home
 * already reads: the oldest pay period whose scheduled payday passed with no payroll, with Payroll's own button ("Prepare
 * Nov 2–8") to the same place. A schedule that needs review and a status that couldn't be read say so in the words the
 * corporate Home used; nothing here is new payroll copy. Nothing shows when payroll is up to date or isn't this person's. */
function PayrollNotice({ status }: { status?: HomePayrollStatus | null }) {
  if (!status) return null;
  // Phase 9 (spec 2.2): one glyph per meaning. A status that couldn't be read is not known (Question), never the triangle,
  // which is amber's "check"; a period with no payroll stops payroll (red, WarningCircle).
  if (status.state === "unavailable") return <BCard label="Payroll"><div className="b-notice"><BIcon tone="grey"><BGlyph meaning="unknown" /></BIcon>
    <span className="b-notice__tx"><span className="b-notice__t">Payroll</span><span className="b-notice__s">Payroll status isn’t available right now</span></span></div>
    <div className="b-home-paygo"><BButtonLink href="/app/payroll" kind="ghost" full>Open payroll</BButtonLink></div></BCard>;
  const fact = status.overdue ?? status.reviewRequired;
  if (!fact) return null;
  const range = periodRange(fact.period.startDate, fact.period.endDate);
  const overdue = !!status.overdue;
  return <BCard label={overdue ? "Pay periods with no payroll" : "Payroll schedule needs review"}><div className="b-notice"><BIcon tone={overdue ? "red" : "amber"}><BGlyph meaning={overdue ? "stop" : "check"} /></BIcon>
    <span className="b-notice__tx"><span className="b-notice__t">{overdue ? `${range} has no payroll` : "Payroll schedule needs review"}</span>
      <span className="b-notice__s">{keepWhole(overdue ? `Scheduled payday was ${payDay(fact.payday)}` : `Pay period ${range} · Scheduled payday ${payDay(fact.payday)}`)}</span></span></div>
    <div className="b-home-paygo">{overdue ? <BButtonLink href={`/app/payroll/prepare#unpaid-${fact.period.startDate}`} kind="teal" full label={`Prepare ${range}`}>{`Prepare ${range}`}</BButtonLink>
      : <BButtonLink href="/app/payroll" kind="ghost" full>Open payroll</BButtonLink>}</div>
  </BCard>;
}

/** Payday, as the corporate card says it (R7): the payday, its period, then what to do about timecards and when. It never
 * says "approved" when it can't know, and it never guesses a count while the read is on its way.
 * Phase 3 (MG-003, MG-004): the signed-in person's own timecard is never counted (another reviewer approves it). Someone
 * who can't open Payroll (a Manager, or an Owner without payroll) gets the same tile framed around their own job,
 * approving timecards: what is waiting or the day approval opens leads, payday is the detail, and the white button
 * shows only when there is something to approve today. */
function PaydayTile({ nextPay, timecards, timecardsReady, connection, businessDay, week, payrollStatus }: HomeBProps) {
  if (!nextPay) return null;
  // Phase 4 (U03): one count for every Home and every width (paydayReview): the cards this person may review whose pay
  // period has ended, from the server's typed review facts. A card another reviewer approves is named on its own line
  // and never counted; cards whose facts are missing make the count a lower bound ("At least 2").
  const review = paydayReview(timecards, businessDay, nextPay.period?.endDate);
  const closed = review.toReview, several = review.periods.length > 1;
  const openEnd = review.openEnd;
  const away = nextPay.daysUntil <= 0 ? "Today" : nextPay.daysUntil === 1 ? "Tomorrow" : `In ${nextPay.daysUntil} days`;
  const href = week?.payrollHref ?? "/app/timecards";
  const payday = fmt(nextPay.payday, { weekday: "long", month: "short", day: "numeric" });
  const routed = timecardsReady ? <>
    {review.otherReviewer ? <div className="b-ink__m b-ink__own">{review.otherReviewer === 1 && review.own === 1 ? t.otherReviewerYours : t.otherReviewerCount(review.otherReviewer)}</div> : null}
    {review.unknown ? <div className="b-ink__m b-ink__own">{t.uncheckedCount(review.unknown)}</div> : null}
  </> : null;
  if (href !== "/app/payroll") {
    const opens = openEnd ? nextDay(openEnd) : undefined;
    const untilOpen = opens && businessDay ? Math.round((Date.parse(`${opens}T12:00:00Z`) - Date.parse(`${businessDay}T12:00:00Z`)) / 86_400_000) : null;
    // Phase 8 (a.md #15, b.md #34): a date from the pay schedule is the "Scheduled payday" (DESIGN, payroll scope wording).
    const paydayLine = keepWhole(`Scheduled payday ${fmt(nextPay.payday, { weekday: "short", month: "short", day: "numeric" })}`);
    const view = !timecardsReady ? { big: "Timecards", detail: connection === "loading" || connection === "reconnecting" ? "Checking…" : "Not available right now", chip: null, go: false }
      // Core check (Nov 23, 2026), each fact once: the count is the big line ("10 to approve"); the header already says
      // Timecards, and the cards someone else reviews are their own line below, so the detail only says when.
      : closed ? { big: t.toApprove(closed, review.exact), detail: several ? "Pay periods ended" : "Pay period ended", chip: "Open now", go: true }
      // Cards whose review facts are missing are not "none waiting": the tile says they could not be checked.
      : review.unknown ? { big: "Timecards", detail: "Pay period ended", chip: null, go: true }
      : opens ? { big: `Opens ${fmt(opens, { weekday: "short", month: "short", day: "numeric" })}`, detail: "Timecard approval", chip: untilOpen === null ? null : untilOpen <= 0 ? "Today" : untilOpen === 1 ? "Tomorrow" : `In ${untilOpen} days`, go: false }
      : { big: "None waiting", detail: "Timecards", chip: null, go: false };
    return <BInk label="Timecards">
      {/* Phase 9 (spec 3.1): "Open now" is the one state here that asks for something, so it keeps its chip; when approval
        * opens ("Tomorrow", "In 3 days") is a time fact, grey header text. */}
      <div className="b-ink__top"><span className="b-ink__k">Timecards</span>{view.chip ? <span className={view.go ? "b-ink__due" : "b-ink__due b-ink__due--when"}>{view.chip}</span> : null}</div>
      <div className="b-ink__big">{view.big}</div>
      <div className="b-ink__r2"><span>{view.detail}</span><span>{paydayLine}</span></div>
      {routed}
      {view.go ? <BButtonLink href={href} kind="white" full label="Review timecards">Review timecards</BButtonLink>
        : <BButtonLink href={href} kind="glass" full label="See this week’s hours">See this week’s hours</BButtonLink>}
    </BInk>;
  }
  const step = !timecardsReady ? { title: "Timecards", detail: connection === "loading" || connection === "reconnecting" ? "Checking…" : "Not available right now", done: false }
    // Review B2 (NV-007): the line says the state, never "Ready now" for work nobody has reviewed. Nov 14, 2026 inspection
    // (BR-7): this counts only cards whose pay period has ended, and says so, since Things to do also lists the cards of the
    // period still open (its rows carry the same words, "Pay period ended" and "Pay period still open").
    // Phase 8 (a.md #5): the counted cards belong to a period that ended, not to the payday above, so one period is named.
    : closed ? { title: t.toReview(closed, review.exact), detail: several || !review.periods[0] ? "Pay periods ended" : keepWhole(`Pay period ${periodLabel(review.periods[0].startDate, review.periods[0].endDate)} ended`), done: false }
    : review.unknown ? { title: "Timecards", detail: "Pay period ended", done: false }
    : openEnd ? { title: "Approve timecards", detail: `From ${fmt(nextDay(openEnd), { weekday: "short", month: "short", day: "numeric" })}`, done: false }
    : { title: "Timecards", detail: "None waiting", done: true };
  // Phase 8 (a.md #5): while a period with no payroll leads the column (PayrollNotice), its Prepare is the column's one
  // strong action and this tile has no button of its own (Core check, Nov 23, 2026).
  const behind = payrollStatus?.state === "ready" && !!payrollStatus.overdue;
  return <BInk label="Scheduled payday">
    {/* Phase 9 (spec 3.1): how far away payday is ("In 9 days") is a time fact, so it is grey header text, not a chip; what
      * waits on this person is the line under the date ("11 timecards to review"). */}
    <div className="b-ink__top"><span className="b-ink__k">Scheduled payday</span><span className="b-ink__due b-ink__due--when">{away}</span></div>
    <div className="b-ink__big">{payday}</div>
    {nextPay.period ? <div className="b-ink__m">Pay period {periodLabel(nextPay.period.startDate, nextPay.period.endDate)}</div> : null}
    {/* Review B2 (NV-007): the three unlabelled segments never lit, so they are gone; the line below says where payroll is. */}
    <div className="b-ink__r2"><span>{step.title}</span><span>{step.detail}</span></div>
    {routed}
    {/* Core check (Nov 23, 2026): one main action. While an overdue payroll leads the column, its "Prepare <period>" is
      * the way in, so this tile has no second Prepare button. */}
    {behind ? null : <BButtonLink href={href} kind="white" full label={href === "/app/payroll" ? "Prepare payroll" : "Open timecards"}>{href === "/app/payroll" ? "Prepare payroll" : "Open timecards"}</BButtonLink>}
  </BInk>;
}

/** Phase 3 (OW-006): coverage is one line, not a tile: "Staffing 58%", a 6px bar filled to it, then "193 h 30 min of
 * 336 h". Positions and Lead follow only when the workplace requires them; what isn't required is not mentioned. The
 * figures are the schedule health read's (percentText is the shared rounding); nothing is recomputed. */
function CoverageLine({ coverage }: { coverage: CoverageMinutes }) {
  // Phase 4 (U09): the figure says what it measures. With no staffing needs there is no percentage, and the line says
  // "No staffing needs set" (never 0% or 100%). The explanation opens under the line.
  const explain = <Explain text={t.staffingExplain} label={t.explain} />;
  if (coverage.state === "not_configured" || coverage.staffing.percent === null) return <div className="b-cov" role="group" aria-label="Covered this week"><span className="b-cov__k">Staffing</span><span className="b-cov__d">{t.noNeeds}</span>{explain}</div>;
  const extra: [string, MinuteObligation][] = ([["Positions", coverage.positions], ["Lead", coverage.lead]] as [string, MinuteObligation][]).filter(([, value]) => value.required !== 0);
  const staffing = coverage.staffing, percent = Math.max(0, Math.min(100, coverage.staffing.percent));
  const detail = `${minutesText(staffing.covered)} of ${minutesText(staffing.required)}`;
  return <div className="b-cov" role="group" aria-label="Covered this week">
    <span className="b-cov__k" data-short={percent < 100 || undefined}>Staffing <b className="c-num">{percentText(staffing)}</b></span>
    <span className="b-cov__bar" aria-hidden="true"><i style={{ width: `${percent}%` }} data-short={percent < 100 || undefined} /></span>
    <span className="b-cov__d c-num">{detail}</span>
    {extra.map(([name, value]) => <span key={name} className="b-cov__d c-num">{`${name} ${percentText(value)}`}</span>)}
    {explain}
  </div>;
}

/** This week: scheduled hours and people from the dashboard's read, and each day's shifts as a bar (today in teal). */
function ThisWeek({ week, today }: { week: HomeBWeek; today?: string }) {
  const max = Math.max(1, ...week.days.map(day => day.shiftCount));
  const shifts = week.days.reduce((total, day) => total + day.shiftCount, 0);
  return <BCard title="This week" id="b-home-week" link={{ href: "/app/schedule", label: "Schedule" }}>
    {/* Phase 3 (TB-005): two blocks, so a tablet can set the figures beside the bars; stacked everywhere else. */}
    <div className="b-wk">
      <div className="b-wk__a">
        <div className="b-kv">
          {/* Jose (Nov 22, 2026: no label twice): Today's card says "Scheduled" and "People"; the week's hours include drafts
            * (planned), and its people are the staff on the week's schedule. */}
          <div><b className="c-num">{hoursText(week.scheduledHours)}</b><span>Planned</span></div>
          <div><b className="c-num">{shifts}</b><span>{shifts === 1 ? "Shift" : "Shifts"}</span></div>
          <div><b className="c-num">{week.people}</b><span>Staff</span></div>
        </div>
        {week.coverage ? <CoverageLine coverage={week.coverage} /> : null}
      </div>
      {week.days.length === 7 ? <div className="b-wk__b">
        {/* Review B1 (NV-107): a caption and each day's count above its bar, so the bars carry values. */}
        <p className="b-days-cap">Shifts by day</p>
        <div className="b-days-v" aria-hidden="true">{week.days.map(day => <span key={day.date} className="c-num">{day.shiftCount}</span>)}</div>
        <div className="b-days" role="img" aria-label={`Shifts per day: ${week.days.map(day => `${day.weekday} ${day.shiftCount}`).join(", ")}`}>
          {week.days.map(day => <i key={day.date} className={day.date === today ? "today" : undefined} style={{ height: `${Math.max(6, Math.round(day.shiftCount / max * 100))}%` }} />)}
        </div>
        <div className="b-days-l" aria-hidden="true">{week.days.map(day => <span key={day.date}>{day.weekday.slice(0, 3)}</span>)}</div>
      </div> : null}
    </div>
  </BCard>;
}
