import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {requireSessionMutationProof} from '@/lib/auth/session';
import { formatBusinessDateTime } from "@/lib/business-time";
import Link from "next/link";
import { AvailabilityTeamList } from "@/components/availability-team-list";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listEmployees, listLocations } from "@/lib/data/employees";
import { listTeamAvailabilityWindows } from "@/lib/data/availability";
import { listAvailabilitySubmissionStatuses } from "@/lib/data/availability-submissions";
import { getUpcomingAvailabilityWeek, getWeekSettings } from "@/lib/data/week-settings";
import { addDays, formatWeekRange, weekStartFor } from "@/lib/date-utils";
import {ManagerIssueFocus} from './manager-issue-focus';

export async function ManagerAvailability({ week, currentWeek, employeeId, timeZone }: {
  timeZone: string; week?: string; currentWeek: string; employeeId?: string;
}) {
  await requireRoles(MANAGER_ROLES);
  const validWeek = Boolean(week && /^\d{4}-\d{2}-\d{2}$/.test(week) && Number.isFinite(new Date(`${week}T12:00:00Z`).getTime()) && weekStartFor(week) === week);
  const invalidWeek = Boolean(week && !validWeek);
  const source=await withOperationalCompany(await requireSessionMutationProof(),async()=>{
  const upcoming = validWeek ? null : await getUpcomingAvailabilityWeek(currentWeek);
  const selectedWeek = validWeek ? week! : upcoming?.weekStart ?? currentWeek;
  const [settings, statuses, windows, employees, locations] = await Promise.all([
    getWeekSettings(selectedWeek), listAvailabilitySubmissionStatuses(selectedWeek),
    listTeamAvailabilityWindows(selectedWeek), listEmployees(), listLocations(),
  ]);
    return {selectedWeek,settings,statuses,windows,employees,locations};
  });
  if(source.state==='unavailable')return <OperationalUnavailable title="Team availability unavailable" reason={source.reason}/>;
  const {selectedWeek,settings,statuses,windows,employees,locations}=source.data;
  const missing = statuses.filter(item => !item.submitted).length;
  const locationNames = new Map(locations.map(location => [location.id, location.shortName]));
  const employeeLocations = new Map(employees.map(employee => [employee.id, locationNames.get(employee.primaryLocationId)]));
  const ordered = [...statuses].sort((a, b) => Number(a.submitted) - Number(b.submitted) || a.windowCount - b.windowCount || a.employeeName.localeCompare(b.employeeName));
  const locked = Boolean(settings?.availabilityDeadline && new Date(settings.availabilityDeadline).getTime() < new Date().getTime());
  const reviewEmployees = ordered.map(status => ({
    ...status,
    locationName: employeeLocations.get(status.employeeId) ?? "Primary location unavailable",
    windows: status.submitted ? windows.filter(window => window.employeeId === status.employeeId) : [],
    updatedLabel: status.updatedAt ? formatBusinessDateTime(status.updatedAt, timeZone) : undefined,
  }));

  return (<ScopedReadFrame observation={source}>
    <div className="availability-page manager-workflow-page manager-team-availability">
      <ManagerIssueFocus prefix="employee-" />
      <header className="av-page-heading"><div><h1>Team availability</h1><p>Review submissions and available hours for the week.</p></div><Link className="av-button secondary" href={`/app/schedule?week=${selectedWeek}`}>View schedule<CaretRightIcon size={18} aria-hidden="true" /></Link></header>
      {invalidWeek ? <p className="form-error" role="alert">That schedule week is not valid. Showing the upcoming week.</p> : null}
      <section className="av-week-panel" aria-label="Selected week and submission deadline">
        <div className="av-week-context"><span className="av-icon-tile"><CalendarBlankIcon size={24} aria-hidden="true" /></span><div><p>Schedule week</p><nav className="av-week-nav" aria-label="Availability week"><Link href={`/app/availability?week=${addDays(selectedWeek, -7)}`} aria-label="Previous week"><CaretLeftIcon size={18} aria-hidden="true" /></Link><strong>{formatWeekRange(selectedWeek)}</strong><Link href={`/app/availability?week=${addDays(selectedWeek, 7)}`} aria-label="Next week"><CaretRightIcon size={18} aria-hidden="true" /></Link></nav></div></div>
        <div className={`av-deadline${locked ? " locked" : ""}`}><ClockIcon size={20} aria-hidden="true" /><div><strong>{locked ? "Submissions closed" : "Availability deadline"}</strong><p>{settings?.availabilityDeadline ? formatBusinessDateTime(settings.availabilityDeadline, timeZone) : "No deadline set"}</p><span>{locked ? "Submitted hours remain available to review." : settings?.availabilityDeadline ? "Employees can submit until this cutoff." : "Set a cutoff in the schedule to collect submissions."}</span></div></div>
      </section>
      <dl className="av-review-summary"><div><dt>Submitted</dt><dd>{statuses.length - missing}<span> / {statuses.length}</span></dd></div><div><dt>Missing</dt><dd>{missing}</dd></div><div><dt>Unavailable all week</dt><dd>{statuses.filter(item => item.submitted && item.windowCount === 0).length}</dd></div></dl>
      <AvailabilityTeamList employees={reviewEmployees} employeeId={employeeId} />
    </div>
  </ScopedReadFrame>);
}
