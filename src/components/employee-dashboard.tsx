import Link from "next/link";
import { formatDayLabel, formatTime } from "../lib/date-utils";

export type EmployeeUpcomingShift = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isDesignatedLead: boolean;
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
}) {
  const upcomingShifts = publishedShifts.filter((shift) =>
    isUpcomingEmployeeShift(
      shift.date,
      shift.startTime,
      currentDate,
      currentTime,
    ),
  );

  return (
    <div className="employee-dashboard">
      <header className="employee-dashboard-heading">
        <span>Employee Home</span>
        <h1>Welcome, {firstName}.</h1>
        <p>{weekLabel}</p>
      </header>

      <div className="employee-dashboard-grid">
        <div className="employee-dashboard-primary">
          <section className="employee-home-card employee-today-status">
            <div className="employee-today-status-header">
              <span>TODAY&apos;S SHIFT</span>
            </div>

            <div className="employee-today-status-body">
              <p>
                Scheduled: <strong>{todayShiftLabel}</strong>
              </p>
              <p>
                Status: <strong>{todayClockStatus}</strong>
              </p>
            </div>

            <small>
              Clock in and out from your assigned Fuel kiosk.
            </small>
          </section>

          <section className="employee-home-card employee-week-overview">
            <div className="employee-home-card-header">
              <h2>This Week&apos;s Overview</h2>
            </div>

            <div className="employee-week-metrics">
              <div>
                <span>Scheduled Hours</span>
                <strong>{formatEmployeeMetric(scheduledHours, "hours")}</strong>
              </div>
              <div>
                <span>Est. Earnings</span>
                <strong className="earnings">
                  {formatEmployeeMetric(estimatedEarnings, "earnings")}
                </strong>
              </div>
            </div>

            <small className="employee-earnings-note">
              *Calculated from published scheduled shifts; excludes tips.
            </small>
          </section>
        </div>

        <section className="employee-home-card employee-upcoming-card">
          <div className="employee-home-card-header">
            <h2>Upcoming Shifts</h2>
          </div>

          {upcomingShifts.length ? (
            <div className="employee-upcoming-list">
              {upcomingShifts.map((shift) => {
                const day = formatDayLabel(shift.date);

                return (
                  <Link
                    className="employee-upcoming-pill"
                    href={employeeScheduleHref(weekStart, shift.date)}
                    key={shift.id}
                  >
                    <span className="employee-upcoming-day">
                      <strong>{day.weekday}</strong>
                      <small>{day.day}</small>
                    </span>
                    <span className="employee-upcoming-time">
                      {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
                    </span>
                    {shift.isDesignatedLead ? (
                      <span className="employee-upcoming-lead">
                        <i aria-hidden="true" />
                        Designated Lead
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="employee-home-empty">
              <span aria-hidden="true">✓</span>
              <strong>You&apos;re all caught up</strong>
              <small>No more published shifts are scheduled this week.</small>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}