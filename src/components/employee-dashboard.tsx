import Link from "next/link";
import { NavIcon } from "./nav-icon";
import { formatDayLabel, formatTime } from "../lib/date-utils";

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
  estimatedEarnings,
  todayShiftLabel,
  todayClockStatus,
  todayLocationName,
}: {
  firstName: string;
  weekStart: string;
  weekLabel: string;
  currentDate: string;
  currentTime: string;
  publishedShifts: EmployeeUpcomingShift[];
  scheduledHours: number;
  estimatedEarnings: number;
  todayShiftLabel: string;
  todayClockStatus: string;
  todayLocationName?: string;
}) {
  const upcomingShifts = publishedShifts.filter((shift) =>
    isUpcomingEmployeeShift(
      shift.date,
      shift.startTime,
      currentDate,
      currentTime,
    ),
  );

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
          <p className="employee-home-shift-time">{todayShiftLabel}</p>
          {todayLocationName ? <p className="employee-home-location">{todayLocationName}</p> : null}
          <div className="employee-home-status">
            <span>{todayClockStatus}</span>
            <p>Use the Fuel kiosk to clock in.</p>
          </div>
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
                <strong>You&apos;re all caught up</strong>
                <p>No more published shifts are scheduled this week.</p>
              </div>
            )}
          </section>

          <section className="employee-home-summary" aria-labelledby="employee-week-heading">
            <h2 id="employee-week-heading">This Week</h2>
            <dl className="employee-home-metrics">
              <div>
                <dt>Scheduled Hours</dt>
                <dd>
                  <span>{formatEmployeeMetric(scheduledHours, "hours").replace(" hrs", "")}</span>
                  {" "}<small className="employee-home-metric-unit">hrs</small>
                </dd>
              </div>
              <div><dt>Est. Earnings</dt><dd>{formatEmployeeMetric(estimatedEarnings, "earnings")}</dd></div>
            </dl>
            <p className="employee-home-disclaimer">*Calculated from published scheduled shifts; excludes tips.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
