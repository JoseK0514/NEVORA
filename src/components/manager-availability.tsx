import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {requireSessionMutationProof} from '@/lib/auth/session';
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
import { KitLink, PageBand } from "./kit/kit";
import { RequestPagesNav } from "./clean/request-pages-nav";
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

  return (<ScopedReadFrame observation={source}>
    <div className="nv-page wa-page wa-availability" data-nv-page="">
      <PageBand title="Team availability"
        eyebrow={<span className="premium-week-eyebrow">
          <Link className="nv-band-control premium-week-arrow" href={`/app/availability?week=${addDays(selectedWeek, -7)}`} aria-label="Previous week"><CaretLeftIcon size={18} weight="bold" aria-hidden="true" /></Link>
          <span>{keepWhole(formatWeekRange(selectedWeek))}</span>
          <Link className="nv-band-control premium-week-arrow" href={`/app/availability?week=${addDays(selectedWeek, 7)}`} aria-label="Next week"><CaretRightIcon size={18} weight="bold" aria-hidden="true" /></Link>
        </span>}
        // Clean Manager (v3): the deadline joins the summary; the chips below carry the counts, so the stat card goes.
        summary={<>{statuses.length ? `${statuses.length - notSubmitted} of ${statuses.length} submitted for this week. ` : "No one submits availability yet. "}{locked ? `Closed ${deadline}.` : deadline ? `People can submit until ${deadline}.` : <>No deadline set. <KitLink href="/app/schedule/settings">Set one in Scheduling rules</KitLink>.</>}</>}
        extra={<RequestPagesNav current="/app/availability" />} />
      <div className="nv-content">
        <ManagerIssueFocus prefix="employee-" />
        {invalidWeek ? <Notice tone="urgent" title="That schedule week is not valid">Showing the upcoming week instead.</Notice> : null}
        <AvailabilityTeamList employees={reviewEmployees} employeeId={employeeId} />
      </div>
    </div>
  </ScopedReadFrame>);
}
