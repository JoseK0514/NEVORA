import { formatBusinessDateTime } from "@/lib/business-time";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listEmployees, listLocations } from "@/lib/data/employees";
import { listTeamAvailabilityWindows } from "@/lib/data/availability";
import { listAvailabilitySubmissionStatuses } from "@/lib/data/availability-submissions";
import { getUpcomingAvailabilityWeek, getWeekSettings } from "@/lib/data/week-settings";
import { addDays,  formatTime, formatWeekRange, weekStartFor } from "@/lib/date-utils";
import {ManagerIssueFocus} from './manager-issue-focus';

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export async function ManagerAvailability({ week, currentWeek, employeeId, timeZone }: {
  timeZone: string; week?: string; currentWeek: string; employeeId?: string;
}) {
  await requireRoles(MANAGER_ROLES);
  const validWeek = Boolean(week && /^\d{4}-\d{2}-\d{2}$/.test(week) && Number.isFinite(new Date(`${week}T12:00:00Z`).getTime()) && weekStartFor(week) === week);
  const invalidWeek = Boolean(week && !validWeek);
  const upcoming = validWeek ? null : await getUpcomingAvailabilityWeek(currentWeek);
  const selectedWeek = validWeek ? week! : upcoming?.weekStart ?? currentWeek;
  const [settings, statuses, windows, employees, locations] = await Promise.all([
    getWeekSettings(selectedWeek), listAvailabilitySubmissionStatuses(selectedWeek),
    listTeamAvailabilityWindows(selectedWeek), listEmployees(), listLocations(),
  ]);
  const missing = statuses.filter(item => !item.submitted).length;
  const locationNames = new Map(locations.map(location => [location.id, location.shortName]));
  const employeeLocations = new Map(employees.map(employee => [employee.id, locationNames.get(employee.primaryLocationId)]));
  const ordered = [...statuses].sort((a, b) => Number(a.submitted) - Number(b.submitted) || a.windowCount - b.windowCount || a.employeeName.localeCompare(b.employeeName));
  const locked = Boolean(settings?.availabilityDeadline && new Date(settings.availabilityDeadline).getTime() < new Date().getTime());

  return (
    <div className="availability-page manager-workflow-page manager-team-availability">
      <ManagerIssueFocus prefix="employee-" />
      <PageHeader eyebrow="Team review" title="Availability" description="Review submissions and available hours for the selected week." />
      {invalidWeek ? <p className="form-error" role="alert">That schedule week is not valid. Showing the upcoming week.</p> : null}
      <div className="dashboard-week-nav manager-availability-week" aria-label="Availability week">
        <Link href={`/app/availability?week=${addDays(selectedWeek, -7)}`} aria-label="Previous week">‹</Link>
        <strong>{formatWeekRange(selectedWeek)}</strong>
        <Link href={`/app/availability?week=${addDays(selectedWeek, 7)}`} aria-label="Next week">›</Link>
      </div>
      <section className={locked ? "availability-deadline-banner locked" : "availability-deadline-banner"}>
        <div><p className="eyebrow">Availability deadline</p><strong>{settings?.availabilityDeadline ? formatBusinessDateTime(settings.availabilityDeadline, timeZone) : "No deadline set"}</strong><span>{locked ? "Submissions are closed for this week." : settings?.availabilityDeadline ? "Employees can submit until the cutoff." : "Set a cutoff in the schedule to collect weekly submissions."}</span></div>
      </section>
      <section className="panel availability-team-panel">
        <div className="availability-team-heading"><div><h2>Team availability</h2><p>{statuses.length - missing}/{statuses.length} employees submitted · {statuses.filter(item => item.submitted && item.windowCount === 0).length} unavailable all week</p></div><StatusPill tone={missing ? "warning" : "success"}>{missing} missing</StatusPill></div>
        <div className="availability-team-list">
          {ordered.map(status => {
            const submittedWindows = status.submitted ? windows.filter(window => window.employeeId === status.employeeId) : [];
            return <article className={`${employeeId === status.employeeId ? "availability-team-row selected" : "availability-team-row"} manager-issue-target`} tabIndex={-1} id={`employee-${status.employeeId}`} key={status.employeeId}>
              <div className="manager-availability-person"><strong>{status.employeeName}</strong><span>{employeeLocations.get(status.employeeId) ?? "Primary location unavailable"}</span>
                <div className="manager-availability-status"><StatusPill tone={!status.submitted || status.windowCount === 0 ? "neutral" : "success"}>{!status.submitted ? "Not submitted" : status.windowCount === 0 ? "Unavailable all week" : "Submitted"}</StatusPill>{status.updatedAt ? <small>Updated {formatBusinessDateTime(status.updatedAt, timeZone)}</small> : null}</div>
              </div>
              <div className="manager-availability-hours">
                {submittedWindows.length ? <ul className="manager-availability-windows" aria-label={`${status.employeeName} available hours`}>{submittedWindows.map(window => <li key={window.id}><strong>{days[window.dayOfWeek]}</strong><span>{formatTime(window.startTime)} – {formatTime(window.endTime)}</span></li>)}</ul> : <span>{status.submitted ? "No available hours this week." : "No submission for this week."}</span>}
              </div>
            </article>;
          })}
          {!statuses.length ? <div className="timeoff-empty-state"><strong>No active employees</strong><span>Employee and Lead submissions will appear here.</span></div> : null}
        </div>
      </section>
    </div>
  );
}
