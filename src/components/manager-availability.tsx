import { formatBusinessDateTime } from "@/lib/business-time";
import Link from "next/link";
import { AvailabilityTeamList } from "@/components/availability-team-list";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listEmployees, listLocations } from "@/lib/data/employees";
import { listTeamAvailabilityWindows } from "@/lib/data/availability";
import { listAvailabilitySubmissionStatuses } from "@/lib/data/availability-submissions";
import { getUpcomingAvailabilityWeek, getWeekSettings } from "@/lib/data/week-settings";
import { addDays, formatWeekRange, weekStartFor } from "@/lib/date-utils";
import { keepWhole } from "@/lib/keep-whole";
import { Card, KitLink, PageBand, StatGrid } from "./kit/kit";
import { Notice } from "./wave-a/parts";
import {ManagerIssueFocus} from './manager-issue-focus';

/** Phase 3.5 Wave A: Team availability on the kit. The week in the band, the counts and the deadline in one card,
 * then everyone's submission, people who haven't submitted first. */
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
  const notSubmitted = statuses.filter(item => !item.submitted).length;
  const unavailable = statuses.filter(item => item.submitted && item.windowCount === 0).length;
  const locationNames = new Map(locations.map(location => [location.id, location.shortName]));
  const employeeLocations = new Map(employees.map(employee => [employee.id, locationNames.get(employee.primaryLocationId)]));
  const ordered = [...statuses].sort((a, b) => Number(a.submitted) - Number(b.submitted) || a.windowCount - b.windowCount || a.employeeName.localeCompare(b.employeeName));
  const locked = Boolean(settings?.availabilityDeadline && new Date(settings.availabilityDeadline).getTime() < new Date().getTime());
  const reviewEmployees = ordered.map(status => ({
    ...status,
    locationName: employeeLocations.get(status.employeeId) ?? "No primary location",
    windows: status.submitted ? windows.filter(window => window.employeeId === status.employeeId) : [],
    updatedLabel: status.updatedAt ? keepWhole(formatBusinessDateTime(status.updatedAt, timeZone)) : undefined,
  }));
  const deadline = settings?.availabilityDeadline ? keepWhole(formatBusinessDateTime(settings.availabilityDeadline, timeZone)) : null;

  return (
    <div className="nv-page wa-page wa-availability" data-nv-page="">
      <PageBand title="Team availability"
        eyebrow={<span className="premium-week-eyebrow">
          <Link className="nv-band-control premium-week-arrow" href={`/app/availability?week=${addDays(selectedWeek, -7)}`} aria-label="Previous week"><CaretLeftIcon size={18} weight="bold" aria-hidden="true" /></Link>
          <span>{keepWhole(formatWeekRange(selectedWeek))}</span>
          <Link className="nv-band-control premium-week-arrow" href={`/app/availability?week=${addDays(selectedWeek, 7)}`} aria-label="Next week"><CaretRightIcon size={18} weight="bold" aria-hidden="true" /></Link>
        </span>}
        summary={statuses.length ? `${statuses.length - notSubmitted} of ${statuses.length} submitted for this week.` : "No one submits availability yet."} />
      <div className="nv-content">
        <ManagerIssueFocus prefix="employee-" />
        {invalidWeek ? <Notice tone="urgent" title="That schedule week is not valid">Showing the upcoming week instead.</Notice> : null}
        <Card title="This week" id="availability-week"
          foot={<div className="wa-foot"><span>{locked ? `Closed ${deadline}. Submitted hours stay here to review.` : deadline ? `People can submit until ${deadline}.` : "No deadline set. Set one in Scheduling rules to collect submissions."}</span><KitLink href={`/app/schedule?week=${selectedWeek}`}>Open schedule</KitLink></div>}>
          <StatGrid stats={[
            { label: "Submitted", value: <>{statuses.length - notSubmitted}<span className="wa-stat-of"> / {statuses.length}</span></>, ariaLabel: `${statuses.length - notSubmitted} of ${statuses.length} submitted` },
            { label: "Not submitted", value: notSubmitted },
            { label: "Unavailable all week", value: unavailable },
          ]} />
        </Card>
        <AvailabilityTeamList employees={reviewEmployees} employeeId={employeeId} />
      </div>
    </div>
  );
}
