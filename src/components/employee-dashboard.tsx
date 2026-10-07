import Link from "next/link";
import { EmployeeTimePanel } from "./employee-time-panel";
import { NavIcon } from "./nav-icon";
import { formatDayLabel, formatTime } from "../lib/date-utils";
import type {EmployeeScheduleState} from '../lib/data/employee-schedule';

export type EmployeeUpcomingShift = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isDesignatedLead: boolean;
  locationName?: string;
};

export function isUpcomingEmployeeShift(
  date: string,
  startTime: string,
  currentDate: string,
  currentTime: string,
) {
  if (date > currentDate) return true;
  if (date < currentDate) return false;
  return startTime > currentTime;
}

export function employeeScheduleHref(weekStart: string, date: string) {
  return `/app/schedule?week=${encodeURIComponent(weekStart)}&day=${encodeURIComponent(date)}`;
}

export function formatEmployeeMetric(
  value: number,
  kind: "hours" | "earnings",
) {
  if (kind === "hours") return `${value.toFixed(1)} hrs`;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function ScheduleArrow({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12h16m-6-6 6 6-6 6" />
    </svg>
  );
}

export function EmployeeDashboard({
  firstName,
  weekStart,
  weekLabel,
  currentDate,
  currentTime,
  publishedShifts,
  scheduledHours,
  scheduleState='unavailable',
}: {
  firstName: string;
  weekStart: string;
  weekLabel: string;
  currentDate: string;
  currentTime: string;
  publishedShifts: EmployeeUpcomingShift[];
  scheduledHours: number;
  scheduleState?: EmployeeScheduleState;
}) {
  const confirmedShifts=scheduleState==='unavailable'?[]:publishedShifts;
  const emptyLabel=scheduleState==='published'?'Off — no assignment':scheduleState==='unpublished'?'Schedule not published yet':'Schedule unavailable — try again';
  const upcomingShifts = confirmedShifts.filter((shift) =>
    isUpcomingEmployeeShift(
      shift.date,
      shift.startTime,
      currentDate,
      currentTime,
    ),
  );

  const todayShifts = confirmedShifts.filter(shift => shift.date === currentDate)
    .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.id.localeCompare(b.id));

  const todayLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric", timeZone: "UTC",
  }).format(new Date(`${currentDate}T12:00:00Z`));

  return (
    <div className="employee-dashboard employee-home">
      <header className="employee-home-heading">
        <p className="employee-home-eyebrow">Employee Home</p>
        <h1>Welcome, {firstName}.</h1>
        <p className="employee-home-week">{weekLabel}</p>
      </header>

      <div className="employee-home-layout">
        <section className="employee-home-surface employee-home-today" aria-labelledby="employee-today-heading">
          <p className="employee-home-eyebrow">Today</p>
          <h2 id="employee-today-heading">{todayLabel}</h2>
          {todayShifts.length ? <div className="employee-home-published-today">
            {todayShifts.map(shift => <div key={shift.id}>
              <p className="employee-home-shift-time">{formatTime(shift.startTime)} – {formatTime(shift.endTime)}</p>
              {shift.locationName ? <p className="employee-home-location">{shift.locationName}</p> : null}
            </div>)}
          </div> : <p className="employee-home-no-shift">{emptyLabel}</p>}
          {scheduleState==='unpublished'&&todayShifts.length>0?<p>Other eligible locations have not published yet.</p>:null}
          <EmployeeTimePanel compact />
        </section>

        <div className="employee-home-surface employee-home-agenda">
          <section className="employee-home-upcoming" aria-labelledby="employee-upcoming-heading">
            <header className="employee-home-section-heading">
              <h2 id="employee-upcoming-heading">Upcoming Shifts</h2>
              <Link href={`/app/schedule?week=${encodeURIComponent(weekStart)}`}>
                My Schedule <ScheduleArrow />
              </Link>
            </header>
            {upcomingShifts.length ? (
              <div className="employee-home-agenda-list">
                {upcomingShifts.map((shift) => {
                  const day = formatDayLabel(shift.date);
                  return (
                    <Link className="employee-home-agenda-row" href={employeeScheduleHref(weekStart, shift.date)} key={shift.id}>
                      <time className="employee-home-date" dateTime={shift.date} aria-label={day.day}>
                        <span>{day.weekday}</span><strong>{shift.date.slice(8)}</strong>
                      </time>
                      <span className="employee-home-shift-copy">
                        <strong>{formatTime(shift.startTime)} – {formatTime(shift.endTime)}</strong>
                        {shift.locationName ? <small>{shift.locationName}</small> : null}
                        {shift.isDesignatedLead ? <small className="employee-home-lead">Designated Lead</small> : null}
                      </span>
                      <ScheduleArrow className="employee-home-row-arrow" />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="employee-home-empty-state">
                <span className="employee-empty-icon"><NavIcon name="schedule" employee size={16} /></span>
                <strong>{scheduleState==='published'?"You’re all caught up":emptyLabel}</strong>
                <p>{scheduleState==='published'?'No more published shifts are scheduled this week.':scheduleState==='unpublished'?'Check back when your manager publishes the schedule.':'Refresh to check your schedule.'}</p>
              </div>
            )}
          </section>

          <section className="employee-home-summary" aria-labelledby="employee-week-heading">
            <h2 id="employee-week-heading">This Week</h2>
            <dl className="employee-home-metrics">
              <div>
                <dt>{scheduleState==='unpublished'?'Published hours so far':'Scheduled Hours'}</dt>
                <dd>
                  <span>{scheduleState==='unavailable'?'Unavailable':formatEmployeeMetric(scheduledHours, "hours").replace(" hrs", "")}</span>
                  {scheduleState!=='unavailable'?<small className="employee-home-metric-unit"> hrs</small>:null}
                </dd>
              </div>
              <div><dt>Est. Earnings</dt><dd>Unavailable</dd></div>
            </dl>
            <p className="employee-home-disclaimer">Pay rates are not configured. Scheduled hours do not establish your pay.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
