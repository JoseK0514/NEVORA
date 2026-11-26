import { WholeWordHeading } from "@/components/whole-word-heading";
import { readPortalLanguage } from "@/lib/activation/language.server";
import { copy } from "./manager-availability-copy";
import { esBusinessDateTime } from "./availability-copy";
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
import { addDays, weekStartFor } from "@/lib/date-utils";
import { keepWhole } from "@/lib/keep-whole";
import { readNotificationConfig } from "@/lib/notifications/config";
import { communicationAuthority } from "@/lib/communications/service.server";
import { dateRange } from "@/lib/duration-format";
import { weekLabel } from "./quiet/quiet";
import { CorpCard, CorpNav, CorpPage, CorpRow, CorpRows, CorpTitle } from "./corp/corp";
import "@/app/app/schedule/schedule-tools.css";

/** Phase 3.5 Wave A: Team availability on the kit. The week in the band, the counts and the deadline in one card,
 * then everyone's submission, people who haven't submitted first. */
export async function ManagerAvailability({ week, currentWeek, employeeId, timeZone }: {
  timeZone: string; week?: string; currentWeek: string; employeeId?: string;
}) {
  await requireRoles(MANAGER_ROLES);
  const validWeek = Boolean(week && /^\d{4}-\d{2}-\d{2}$/.test(week) && Number.isFinite(new Date(`${week}T12:00:00Z`).getTime()) && weekStartFor(week) === week);
  const invalidWeek = Boolean(week && !validWeek);
  const proof=await requireSessionMutationProof();
  const lang = (await readPortalLanguage(proof)).language, t = copy[lang];
  const dateTime = (value: string) => lang === "es" ? esBusinessDateTime(value, timeZone) : formatBusinessDateTime(value, timeZone);
  const source=await withOperationalCompany(proof,async()=>{
  const upcoming = validWeek ? null : await getUpcomingAvailabilityWeek(currentWeek);
  const selectedWeek = validWeek ? week! : upcoming?.weekStart ?? currentWeek;
  const [settings, statuses, windows, employees, locations] = await Promise.all([
    getWeekSettings(selectedWeek), listAvailabilitySubmissionStatuses(selectedWeek),
    listTeamAvailabilityWindows(selectedWeek), listEmployees(), listLocations(),
  ]);
    return {selectedWeek,settings,statuses,windows,employees,locations};
  });
  if(source.state==='unavailable')return <OperationalUnavailable title={t.teamAvailabilityUnavailable} reason={source.reason} lang={lang}/>;
  const {selectedWeek,settings,statuses,windows,employees,locations}=source.data;

  const locationNames = new Map(locations.map(location => [location.id, location.shortName]));
  const employeeLocations = new Map(employees.map(employee => [employee.id, locationNames.get(employee.primaryLocationId)]));
  const ordered = [...statuses].sort((a, b) => Number(a.submitted) - Number(b.submitted) || a.windowCount - b.windowCount || a.employeeName.localeCompare(b.employeeName));
  const locked = Boolean(settings?.availabilityDeadline && new Date(settings.availabilityDeadline).getTime() < new Date().getTime());
  const reviewEmployees = ordered.map(status => ({
    ...status,
    locationName: employeeLocations.get(status.employeeId) ?? t.noPrimaryLocation,
    windows: status.submitted ? windows.filter(window => window.employeeId === status.employeeId) : [],
    updatedLabel: status.updatedAt ? (lang === "es" ? dateTime(status.updatedAt) : keepWhole(dateTime(status.updatedAt))) : undefined,
  }));
  const deadline = settings?.availabilityDeadline ? (lang === "es" ? dateTime(settings.availabilityDeadline) : keepWhole(dateTime(settings.availabilityDeadline))) : null;

  // Quiet (v4, approved Oct 23): the week and the count under the title, the deadline as one row, then the people.
  const remindersOn = readNotificationConfig(process.env).featureEnabled;
  const deadlineDay = settings?.availabilityDeadline ? new Intl.DateTimeFormat(lang === "es" ? "es-PR" : "en-US", { timeZone, weekday: "short", month: "short", day: "numeric" }).format(new Date(settings.availabilityDeadline)) : null;
  // Reminders (U10): the command needs the session's communication authority (the same value the Updates pages hand
  // their client), the week and its exact deadline. A week with no deadline, or a closed one, offers no reminder.
  let authority: string | undefined;
  try { authority = communicationAuthority(proof); } catch { authority = undefined; }
  const deadlineAt = settings?.availabilityDeadline ? new Date(settings.availabilityDeadline) : null;
  const remind = authority && deadlineAt && Number.isFinite(deadlineAt.getTime()) && !locked && (proof.employee.role === "OWNER" || proof.employee.role === "MANAGER")
    ? { authority, timeZone, actor: proof.employee.role, weekStart: selectedWeek, expectedDeadline: deadlineAt.toISOString(), week: lang === "es" ? dateRange(selectedWeek, selectedWeek, { year: "never", locale: "es-PR" }) : keepWhole(dateRange(selectedWeek, selectedWeek, { year: "never" })) } : null;
  // Phase 2 (Schedule tools, C10, Nov 23, 2026): Direction B for real. The Corp page the B layer draws as the band (the
  // title and the week); then the deadline row and one card of people with Not sent and Sent as its filter chips, as on
  // Team. Same reads, links, reminders and deep link as before.
  const selectedWeekLabel = lang === "es" ? dateRange(selectedWeek, addDays(selectedWeek, 6), { year: "never", locale: "es-PR" }) : weekLabel(selectedWeek);
  const weekLine = keepWhole(t.weekOf.replace("{selectedWeek}", selectedWeekLabel));
  return (<ScopedReadFrame observation={source} lang={lang}>
    <CorpPage className="c-avteam c-page--narrow" labelledBy="avteam-title">
      <CorpNav back={{ href: "/app/inbox", label: t.thingsToDo }} title={lang === "es" ? <WholeWordHeading text={t.availability} /> : t.availability} titleId="avteam-title" phoneOnly />
      <p className="c-phone-sub" aria-hidden="true">{weekLine}</p>
      <CorpTitle title={t.availability} sub={weekLine} wide />
      <AvailabilityTeamList employees={reviewEmployees} employeeId={employeeId} remind={remind} needsDeadline={!deadlineAt} before={<>
        {invalidWeek ? <p className="c-st__msg c-st__msg--error form-error" role="alert">{t.thatWeekIsnTValidSoThisIs}</p> : null}
        <CorpCard ariaLabel={t.deadline}><CorpRows>
          {/* Phase 3 (MG-016): the row says what a deadline does. The reminder goes out 24 hours before the deadline
              (notifications/policy.ts), so the line shows only where the workplace's alerts are on. */}
          {/* Phase 2 (C10): the row is read by what it shows; a passed deadline says so in words, not only to screen readers. */}
          <li><CorpRow title={t.deadline} detail={locked ? t.passedDeadline.replace("{deadline}", deadline ?? "") : remindersOn && deadline ? t.peopleAreRemindedTheDayBefore : undefined} value={deadlineDay ?? t.notSet} href="/app/schedule/settings" /></li>
        </CorpRows></CorpCard>
      </>} />
    </CorpPage>
  </ScopedReadFrame>);
}
