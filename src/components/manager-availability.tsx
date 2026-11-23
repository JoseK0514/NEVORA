import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
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
import { readNotificationConfig } from "@/lib/notifications/config";
import { communicationAuthority } from "@/lib/communications/service.server";
import { dateRange } from "@/lib/duration-format";
import { weekLabel } from "./quiet/quiet";
import { CorpNav, CorpPage, CorpTitle } from "./corp/corp";
import { BCallout, BCard, BIcon, BList, BRow } from "./owner-b/b-kit";
import { HourglassMediumIcon } from "@phosphor-icons/react/dist/ssr/HourglassMedium";

/** Phase 3.5 Wave A: Team availability on the kit. The week in the band, the counts and the deadline in one card,
 * then everyone's submission, people who haven't submitted first. */
export async function ManagerAvailability({ week, currentWeek, employeeId, timeZone }: {
  timeZone: string; week?: string; currentWeek: string; employeeId?: string;
}) {
  await requireRoles(MANAGER_ROLES);
  const validWeek = Boolean(week && /^\d{4}-\d{2}-\d{2}$/.test(week) && Number.isFinite(new Date(`${week}T12:00:00Z`).getTime()) && weekStartFor(week) === week);
  const invalidWeek = Boolean(week && !validWeek);
  const proof=await requireSessionMutationProof();
  const source=await withOperationalCompany(proof,async()=>{
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

  // Quiet (v4, approved Oct 23): the week and the count under the title, the deadline as one row, then the people.
  const remindersOn = readNotificationConfig(process.env).featureEnabled;
  const deadlineDay = settings?.availabilityDeadline ? new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric" }).format(new Date(settings.availabilityDeadline)) : null;
  // Reminders (U10): the command needs the session's communication authority (the same value the Updates pages hand
  // their client), the week and its exact deadline. A week with no deadline, or a closed one, offers no reminder.
  let authority: string | undefined;
  try { authority = communicationAuthority(proof); } catch { authority = undefined; }
  const deadlineAt = settings?.availabilityDeadline ? new Date(settings.availabilityDeadline) : null;
  const remind = authority && deadlineAt && Number.isFinite(deadlineAt.getTime()) && !locked && (proof.employee.role === "OWNER" || proof.employee.role === "MANAGER")
    ? { authority, timeZone, actor: proof.employee.role, weekStart: selectedWeek, expectedDeadline: deadlineAt.toISOString(), week: keepWhole(dateRange(selectedWeek, selectedWeek, { year: "never" })) } : null;
  // Phase 2 (C10, Nov 23, 2026): the Corp frame (CorpNav on a phone, CorpTitle in the band from 768px), Not sent and Sent
  // as the band's segments with their counts, then one card for the week (its title) and its deadline, then the people. Each fact
  // once: the week is in the card (not under the title too), the counts are on the segments.
  const deadlineLine = deadline ? locked ? `Passed ${deadline}` : remindersOn ? "People are reminded the day before" : undefined : undefined;
  return (<ScopedReadFrame observation={source}>
    <CorpPage className="c-availteam c-page--narrow" labelledBy="availteam-title">
      <CorpNav back={{ href: "/app/inbox", label: "Things to do" }} title="Availability" titleId="availteam-title" phoneOnly />
      <CorpTitle title="Availability" wide />
      <AvailabilityTeamList employees={reviewEmployees} employeeId={employeeId} remind={remind} needsDeadline={!deadlineAt} before={<>
        {invalidWeek ? <BCallout tone="amber" icon="unknown" role="alert">That week isn’t valid, so this is the upcoming week.</BCallout> : null}
        <BCard title={`Week of ${keepWhole(weekLabel(selectedWeek))}`} id="availability-week">
          <BList>
            {/* Phase 3 (MG-016): the row says what a deadline does. The reminder goes out 24 hours before the deadline
                (notifications/policy.ts), so the line shows only where the workplace's alerts are on. */}
            <BRow lead={<BIcon tone={locked ? "grey" : "teal"}><HourglassMediumIcon weight="bold" /></BIcon>} title="Deadline" sub={deadlineLine}
              end={<span className="c-avt__value">{deadlineDay ?? "Not set"}</span>} href="/app/schedule/settings" />
          </BList>
        </BCard>
      </>} />
    </CorpPage>
  </ScopedReadFrame>);
}
