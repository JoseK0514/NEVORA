import {ResponsiveEmployeePlanning} from '@/components/employee-mobile/planning';
import {employeeViewAuthority} from '@/lib/employee-view-authority.server';
import {requireSessionMutationProof} from '@/lib/auth/session';
import { getWorkspace } from "@/lib/data/workspaces";
import { keepWhole } from "@/lib/keep-whole";
import { businessDate, formatBusinessDateTime } from "@/lib/business-time";
import { ManagerAvailability } from "@/components/manager-availability";
import Link from "next/link";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { AvailabilitySignatureEditor } from "@/components/availability-signature";
import { CorpLink, CorpNav, CorpPage, CorpPill, CorpTitle } from "@/components/corp/corp";
import "@/components/availability-corp.css";
import { availabilityWeekLabel } from "@/components/availability-week-label";
import { requireSession } from "@/lib/auth/session";
import { isManagerRole } from "@/lib/auth/permissions";
import { listAvailability } from "@/lib/data/availability";
import { getAvailabilitySubmissionStatus } from "@/lib/data/availability-submissions";
import type { AvailabilitySubmissionStatus } from "@/lib/assistance/availability-submission";
import {
  getUpcomingAvailabilityWeek,
  getWeekSettings,
  listWeeklyAvailability,
} from "@/lib/data/week-settings";
import {
  formatWeekRange,
  addDays, isValidWeekStart, weekStartFor,
} from "@/lib/date-utils";
import type { AvailabilityState } from "@/lib/availability-presets";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function validWeek(value?: string) {
  return (
    value && isValidWeekStart(value)
  );
}

function buildState(
  availability: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>,
): AvailabilityState {
  return Object.fromEntries(
    ALL_DAYS.map((dayOfWeek) => {
      const existing = availability.find(
        (window) => window.dayOfWeek === dayOfWeek,
      );

      return [
        dayOfWeek,
        {
          available: Boolean(existing),
          startTime: existing?.startTime ?? "06:00",
          endTime: existing?.endTime === "24:00" ? "00:00" : existing?.endTime ?? "18:00",
        },
      ];
    }),
  ) as AvailabilityState;
}

function submissionStatusCopy(status: AvailabilitySubmissionStatus, hasDeadline = true) {
  if (status.state === "LOCKED") {
    if (!status.submitted) {
      return {
        label: "Locked · not submitted",
        detail: "No weekly availability was submitted before the deadline.",
      };
    }

    return {
      label: "Locked · submitted",
      detail:
        status.windowCount === 0
          ? "You submitted that you are unavailable for the entire week."
          : "Your submitted weekly availability is locked for this schedule.",
    };
  }

  if (status.state === "SUBMITTED_UNAVAILABLE") {
    return {
      label: "Submitted · unavailable all week",
      detail: "Management can see that you intentionally submitted no available hours.",
    };
  }

  if (status.state === "SUBMITTED") {
    return {
      label: "Submitted",
      detail: "Management can see that your weekly availability is complete.",
    };
  }

  return {
    label: "Not submitted",
    detail: hasDeadline ? "Submit this week before the deadline so management can schedule accurately." : "Submit this week so management can schedule accurately.",
  };
}

export const metadata = { title: "Availability" };

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    saved?: string;
    week?: string;
    employeeId?: string;
  }>;
}) {
  const session = await requireSession();
  const workspace = await getWorkspace();
  const manager = isManagerRole(session.role);
  const params = await searchParams;
  const currentWeek = weekStartFor(businessDate(new Date(), workspace.timeZone));
  if (manager) return ManagerAvailability({ timeZone: workspace.timeZone, week: params.week, currentWeek, employeeId: params.employeeId });

  const selectedWeek = validWeek(params.week) ? params.week! : undefined;

  const [normalAvailability, upcomingWeek] = await Promise.all([
    listAvailability(session.id),
    getUpcomingAvailabilityWeek(currentWeek),
  ]);

  let initialAvailability = buildState(normalAvailability);
  let settings = null;
  let submissionStatus: AvailabilitySubmissionStatus | null = null;

  if (selectedWeek) {
    const [weekSettings, weekly, status] = await Promise.all([
      getWeekSettings(selectedWeek),
      listWeeklyAvailability(session.id, selectedWeek),
      getAvailabilitySubmissionStatus(session.id, selectedWeek),
    ]);
    settings = weekSettings;
    submissionStatus = status;

    initialAvailability = buildState(weekly);
  }

  // Server-rendered deadline status intentionally reflects the current request time.
  // eslint-disable-next-line react-hooks/purity
  const requestTime = Date.now();
  const locked = Boolean(
    selectedWeek &&
      settings?.availabilityDeadline &&
      requestTime > new Date(settings.availabilityDeadline).getTime(),
  );
  const submissionCopy = submissionStatus
    ? submissionStatusCopy(submissionStatus, Boolean(settings?.availabilityDeadline))
    : null;

  // Release 1 (board E-Availability): one card of seven day rows, a line under it, then Save. The usual week links to
  // one schedule week; a week shows its state and arrows to the weeks around it.
  const deadline = selectedWeek && settings?.availabilityDeadline ? new Date(settings.availabilityDeadline) : null;
  const inZone = (date: Date, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: workspace.timeZone, ...options }).format(date);
  const nextWeek = upcomingWeek?.weekStart ?? addDays(currentWeek, 7);
  const weekLabel = (week: string) => `Week of ${keepWhole(formatWeekRange(week).split(/\s+[–-]\s+/)[0])}`;
  const pill = !selectedWeek ? null : locked ? <CorpPill tone="neutral">Closed</CorpPill>
    : submissionStatus?.submitted ? <CorpPill tone="teal">{submissionStatus.windowCount === 0 ? "Unavailable all week" : "Submitted"}</CorpPill>
    : <CorpPill tone="amber">{deadline ? `Due ${inZone(deadline, { weekday: "short", month: "short", day: "numeric" })}` : "Not submitted"}</CorpPill>;
  const card = selectedWeek
    ? { label: availabilityWeekLabel(selectedWeek), aside: <>{pill}<span className="c-avail__arrows">
      <Link href={`/app/availability?week=${addDays(selectedWeek, -7)}`} aria-label="Previous week"><CaretLeftIcon className="c-ic" weight="bold" aria-hidden="true" /></Link>
      <Link href={`/app/availability?week=${addDays(selectedWeek, 7)}`} aria-label="Next week"><CaretRightIcon className="c-ic" weight="bold" aria-hidden="true" /></Link></span></> }
    : { label: "Your usual week", aside: <CorpLink href={`/app/availability?week=${nextWeek}`}>Change one week</CorpLink> };
  const upcomingDue = !selectedWeek && upcomingWeek?.availabilityDeadline ? `Send ${weekLabel(upcomingWeek.weekStart).toLowerCase()} by ${formatBusinessDateTime(upcomingWeek.availabilityDeadline, workspace.timeZone)}.` : null;
  const note = selectedWeek
    ? <span>{locked ? (submissionCopy?.detail ?? "The deadline passed. Your submitted hours are kept.") : deadline ? `Send it by ${inZone(deadline, { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}. Hours for this week only; your usual week stays the same.` : "Hours for this week only; your usual week stays the same."} <Link className="c-link" href="/app/availability">Usual week</Link></span>
    : <span>Your manager uses this to build the schedule. One-off days off go in Requests.</span>;
  const sub = selectedWeek ? `Used for the week of ${keepWhole(formatWeekRange(selectedWeek))}` : upcomingDue ?? "Used to build your future schedules";
  const notices = <>
    {params.error ? <p className="c-error" role="alert">
      {params.error === "locked"
        ? "The availability deadline for this week has passed."
        : params.error === "concurrent"
          ? "Your availability changed while saving. Review this week and try again."
          : params.error === "invalid_week"
          ? "That schedule week is not valid."
          : "Every available day needs a valid start and end time."}
    </p> : null}
    {params.saved ? <p className="c-note" role="status">{selectedWeek ? "Your availability for this schedule week has been updated." : "Your usual week has been updated."}</p> : null}
  </>;

  const proof=await requireSessionMutationProof();
  return (
    <ResponsiveEmployeePlanning authority={employeeViewAuthority(proof,'planning')} view="availability" selection={selectedWeek??'normal'}><CorpPage className="c-avail">
      <CorpNav back={{ href: "/app/schedule", label: "Schedule" }} title="Availability" phoneOnly />
      <CorpTitle wide title="Availability" sub={sub} />
      {notices}
      <AvailabilitySignatureEditor key={selectedWeek ?? "normal"} initialAvailability={initialAvailability} weekStart={selectedWeek} locked={locked} card={card} note={note} />
    </CorpPage></ResponsiveEmployeePlanning>
  );
}
