import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {withOperationalScope} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {requireSessionMutationProof} from '@/lib/auth/session';
import { formatBusinessDateTime } from "@/lib/business-time";
import { AvailabilityTeamList } from "@/components/availability-team-list";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listEmployees, listLocations } from "@/lib/data/employees";
import { listTeamAvailabilityWindows } from "@/lib/data/availability";
import { listAvailabilitySubmissionStatuses } from "@/lib/data/availability-submissions";
import { getUpcomingAvailabilityWeek, getWeekSettings } from "@/lib/data/week-settings";
import { weekStartFor } from "@/lib/date-utils";
import { keepWhole } from "@/lib/keep-whole";
import { QuietHeader, QuietList, QuietNav, QuietPage, QuietRow, weekLabel } from "./quiet/quiet";

/** Phase 3.5 Wave A: Team availability on the kit. The week in the band, the counts and the deadline in one card,
 * then everyone's submission, people who haven't submitted first. */
export async function ManagerAvailability({ week, currentWeek, employeeId, timeZone }: {
  timeZone: string; week?: string; currentWeek: string; employeeId?: string;
}) {
  await requireRoles(MANAGER_ROLES);
  const validWeek = Boolean(week && /^\d{4}-\d{2}-\d{2}$/.test(week) && Number.isFinite(new Date(`${week}T12:00:00Z`).getTime()) && weekStartFor(week) === week);
  const invalidWeek = Boolean(week && !validWeek);
  // B-12: Owners and company-wide Managers see everyone; a location-scoped Manager sees the people of their
  // locations, each query filtered to that scope.
  const source=await withOperationalScope(await requireSessionMutationProof(),async ctx=>{
  const upcoming = validWeek ? null : await getUpcomingAvailabilityWeek(currentWeek);
  const selectedWeek = validWeek ? week! : upcoming?.weekStart ?? currentWeek;
  if (ctx.ids) {
    const scope = { workspaceId: ctx.workspace.id, locationIds: ctx.ids };
    const [settings, statuses] = await Promise.all([getWeekSettings(selectedWeek), listAvailabilitySubmissionStatuses(selectedWeek, scope)]);
    const windows = statuses.length ? await listTeamAvailabilityWindows(selectedWeek, statuses.map(status => status.employeeId)) : [];
    return {selectedWeek,settings,statuses,windows,employees:statuses.map(status=>({id:status.employeeId,primaryLocationId:status.primaryLocationId??''})),
      locations:ctx.view.locations.map(location=>({id:location.id,shortName:location.shortName})),companyWide:false};
  }
  const [settings, statuses, windows, employees, locations] = await Promise.all([
    getWeekSettings(selectedWeek), listAvailabilitySubmissionStatuses(selectedWeek),
    listTeamAvailabilityWindows(selectedWeek), listEmployees(), listLocations(),
  ]);
    return {selectedWeek,settings,statuses,windows,employees,locations,companyWide:true};
  });
  if(source.state==='unavailable')return <OperationalUnavailable title="Team availability unavailable" reason={source.reason}/>;
  const {selectedWeek,settings,statuses,windows,employees,locations,companyWide}=source.data;
  const notSubmitted = statuses.filter(item => !item.submitted).length;
  const unavailable = statuses.filter(item => item.submitted && item.windowCount === 0).length;
  const locationNames = new Map(locations.map(location => [location.id, location.shortName]));
  const employeeLocations = new Map(employees.map(employee => [employee.id, locationNames.get(employee.primaryLocationId)]));
  const ordered = [...statuses].sort((a, b) => Number(a.submitted) - Number(b.submitted) || a.windowCount - b.windowCount || a.employeeName.localeCompare(b.employeeName));
  const locked = Boolean(settings?.availabilityDeadline && new Date(settings.availabilityDeadline).getTime() < new Date().getTime());
  const reviewEmployees = ordered.map(status => ({
    ...status,
    locationName: employeeLocations.get(status.employeeId) ?? (companyWide ? "No primary location" : "Works at your location"),
    windows: status.submitted ? windows.filter(window => window.employeeId === status.employeeId) : [],
    updatedLabel: status.updatedAt ? keepWhole(formatBusinessDateTime(status.updatedAt, timeZone)) : undefined,
  }));
  const deadline = settings?.availabilityDeadline ? keepWhole(formatBusinessDateTime(settings.availabilityDeadline, timeZone)) : null;

  // Quiet (v4, approved Oct 23): the week and the count under the title, the deadline as one row, then the people.
  const deadlineDay = settings?.availabilityDeadline ? new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric" }).format(new Date(settings.availabilityDeadline)) : null;
  return (<ScopedReadFrame observation={source}>
    <QuietPage className="q-availability">
      <QuietNav back={{ href: "/app/inbox", label: "Inbox" }} />
      <QuietHeader title="Availability" sub={`${keepWhole(weekLabel(selectedWeek))} · ${statuses.length - notSubmitted} of ${statuses.length} sent`} />
      {invalidWeek ? <p className="q-error q-first" role="alert">That week isn’t valid, so this is the upcoming week.</p> : null}
      <QuietList style={{ marginTop: 16 }}>
        {/* Scheduling rules are company settings: a location-scoped Manager sees the deadline without the link. */}
        <QuietRow title="Deadline" value={deadlineDay ?? "Not set"} tone="l" href={companyWide ? "/app/schedule/settings" : undefined}
          label={locked ? `Deadline passed ${deadline}` : deadline ? `Deadline ${deadline}` : companyWide ? "No deadline set. Set one in Scheduling rules" : "No deadline set"} />
      </QuietList>
      <AvailabilityTeamList employees={reviewEmployees} employeeId={employeeId} />
    </QuietPage>
  </ScopedReadFrame>);
}
