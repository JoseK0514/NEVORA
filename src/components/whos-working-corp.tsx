"use client";
import "./whos-working-corp.css";
import { useEffect, useState, type ReactNode } from "react";
import { CaretDownIcon } from "@phosphor-icons/react/ssr";
import { CorpAvatar, CorpBody, CorpButton, CorpCard, CorpNav, CorpPage, CorpPill, CorpRow, CorpTitle } from "./corp/corp";
import { useClockMonitor } from "./clean/use-clock-monitor";
import { useToday } from "./manager-today";
import type { ClockMonitor } from "@/lib/time-clock";
import type { Today } from "@/lib/today/project";

/* Who's working (Release 1, board O-OnShift): Home's "Who's working" link. Who is clocked in now (the clock monitor), who
 * hasn't clocked in for a shift that started, and published shifts that ended with no clock-in (Today). The attendance
 * review and time corrections follow, unchanged. Presentation only: the same two reads Home uses. */

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
const clock = (iso: string, timeZone: string) => new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
const lateBy = (start: string, observedAt: string) => {
  const minutes = Math.floor((Date.parse(observedAt) - Date.parse(start)) / 60_000);
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60 ? `${minutes % 60} min ` : ""}late` : `${Math.max(minutes, 1)} min late`;
};
const SHOWN = 5;
const REVIEW_FRAGMENT = /^#(?:review$|attendance-.|correction-.)/;

export function WhosWorkingCorp({ children, homeHref = "/app" }: { children?: ReactNode; homeHref?: string }) {
  const { monitor, refreshing } = useClockMonitor();
  const { snapshot: today, refresh } = useToday();
  return <WhosWorkingView monitor={monitor} today={today} refreshing={refreshing} onRetry={refresh} homeHref={homeHref}>{children}</WhosWorkingView>;
}

export function WhosWorkingView({ monitor, today, refreshing = false, onRetry, homeHref = "/app", children }: {
  monitor: ClockMonitor | null; today: Today | null; refreshing?: boolean; onRetry?: () => void; homeHref?: string; children?: ReactNode;
}) {
  const [all, setAll] = useState(false);
  // The attendance review and time corrections sit behind one row, open when a link points at them: #review, or an
  // Inbox link to one flagged clock-in (#attendance-…) or one correction request (#correction-…), which the review
  // then focuses. Read after mount: the server render has no fragment, and a client navigation sets it at commit.
  const [reviewOpen, setReviewOpen] = useState(false);
  useEffect(() => {
    const sync = () => { if (REVIEW_FRAGMENT.test(window.location.hash)) setReviewOpen(true); };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const ready = monitor?.state === "ready" ? monitor : null;
  const timeZone = ready?.timeZone ?? (today?.state === "ready" ? today.timeZone : "UTC");
  const people = ready ? [...ready.employees].sort((a, b) => a.clockInAt.localeCompare(b.clockInAt)) : [];
  const shown = all ? people : people.slice(0, SHOWN);
  const day = today?.state === "ready" ? today : null;
  const late = day ? day.missed.filter(shift => shift.status === "not_clocked_in") : [];
  const none = day ? day.missed.filter(shift => shift.status === "no_punches") : [];
  const places = new Set([...people.map(person => person.locationId), ...(day?.shifts ?? []).map(shift => shift.locationId)]).size > 1;
  const dateLine = day ? new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(new Date(`${day.today}T12:00:00Z`)) : "Today";
  const sub = `${dateLine}${ready ? ` · ${clock(ready.observedAt, timeZone)}` : ""}`;
  const where = (name: string) => places ? ` · ${name}` : "";
  // A7: a single-column page, capped at the kit's narrow width on desktop.
  return <CorpPage className="c-who c-page--narrow" labelledBy="who-title">
    <CorpNav back={{ href: homeHref, label: "Home" }} title="Who’s working" phoneOnly />
    <CorpTitle id="who-title" title="Who’s working" sub={sub} wide />
    <p className="c-phone-sub" aria-hidden="true">{sub}</p>
    <CorpCard id="who-in" label={ready ? `Clocked in (${people.length})` : "Clocked in"} aside={ready ? <CorpPill tone="teal">Live</CorpPill> : undefined}>
      {!ready ? <CorpBody><p className="c-who__state" aria-busy={refreshing || undefined}>{monitor?.state === "unavailable" ? "Clock-ins aren’t available right now." : "Checking who’s clocked in…"}</p></CorpBody>
        : people.length ? <ul className="c-rows" aria-label="Clocked in now">{shown.map(person => <li key={person.timeEntryId}>
          <CorpRow href={`/app/employees/${encodeURIComponent(person.employeeId)}`} bold title={person.employeeName} avatar={<CorpAvatar initials={initials(person.employeeName)} grey />}
            detail={`${person.state === "ON_BREAK" && person.breakStartAt ? `On break since ${clock(person.breakStartAt, timeZone)}` : `In since ${clock(person.clockInAt, timeZone)}`}${where(person.locationName)}`}
            trail={person.state === "ON_BREAK" ? <CorpPill tone="blue">On break</CorpPill> : undefined} chevron />
        </li>)}</ul> : <div className="c-empty c-empty--card"><b className="c-empty__title">No one is clocked in right now</b><span className="c-empty__body">People appear here when they clock in.</span></div>}
      {ready && !all && people.length > SHOWN ? <button type="button" className="c-who__more" onClick={() => setAll(true)}>{`Show ${people.length - SHOWN} more`}</button> : null}
    </CorpCard>
    {today?.state === "unavailable" ? <CorpCard as="div" ariaLabel="Shifts today"><CorpBody>
      <p className="c-who__state">Today’s shifts aren’t available right now.</p>
      {onRetry ? <CorpButton kind="secondary" size="md" onClick={onRetry}>Try again</CorpButton> : null}
    </CorpBody></CorpCard> : null}
    {late.length ? <CorpCard id="who-late" label={`Not in yet (${late.length})`}><ul className="c-rows" aria-label="Not in yet">{late.map(shift => <li key={shift.id}>
      <CorpRow href={`/app/employees/${encodeURIComponent(shift.employeeId)}`} bold title={shift.employeeName} avatar={<CorpAvatar initials={initials(shift.employeeName)} grey />}
        detail={`Due ${clock(shift.startAt, timeZone)}${where(shift.locationName)}`} value={day ? lateBy(shift.startAt, day.observedAt) : undefined} valueTone="red" chevron />
    </li>)}</ul></CorpCard> : null}
    {none.length ? <CorpCard id="who-none" label={`No clock-in (${none.length})`}><ul className="c-rows" aria-label="Shifts that ended with no clock-in">{none.map(shift => <li key={shift.id}>
      <CorpRow href={`/app/timecards#timecard-${encodeURIComponent(shift.employeeId)}`} bold title={shift.employeeName} avatar={<CorpAvatar initials={initials(shift.employeeName)} grey />}
        detail={`${clock(shift.startAt, timeZone)} – ${clock(shift.endAt, timeZone)}${where(shift.locationName)}`} chevron />
    </li>)}</ul></CorpCard> : null}
    {children ? <CorpCard as="div" ariaLabel="Review">
      <CorpRow onClick={() => setReviewOpen(open => !open)} bold title="Clock-ins and corrections" detail="Review flagged clock-ins and time corrections" chevron={false}
        trail={<CaretDownIcon className={reviewOpen ? "c-chev c-who__caret c-who__caret--open" : "c-chev c-who__caret"} weight="bold" aria-hidden="true" />} label={`Clock-ins and corrections, ${reviewOpen ? "expanded" : "collapsed"}`} />
    </CorpCard> : null}
    {children && reviewOpen ? <div className="c-who__review" id="review">{children}</div> : null}
  </CorpPage>;
}
