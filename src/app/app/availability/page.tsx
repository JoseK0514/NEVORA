import { getWorkspace } from "@/lib/data/workspaces";
import { keepWhole } from "@/lib/keep-whole";
import { businessDate, formatBusinessDateTime } from "@/lib/business-time";
import { ManagerAvailability } from "@/components/manager-availability";
import { AvailabilitySignatureEditor, type AvailabilityStatus } from "@/components/availability-signature";
import { QuietPage, QuietSegments } from "@/components/quiet/quiet";
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

  // v5 (mockup E10): the usual week or one schedule week, chosen with the segments; the deadline is said under the days.
  const deadline = selectedWeek && settings?.availabilityDeadline ? new Date(settings.availabilityDeadline) : null;
  const inZone = (date: Date, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: workspace.timeZone, ...options }).format(date);
  const nextWeek = upcomingWeek?.weekStart ?? addDays(currentWeek, 7);
  const weekLabel = (week: string) => `Week of ${keepWhole(formatWeekRange(week).split(/\s+[–-]\s+/)[0])}`;
  const status: AvailabilityStatus = submissionStatus && submissionCopy
    ? { label: locked ? (submissionStatus.submitted ? "Locked · submitted" : "Locked") : submissionStatus.submitted ? "Submitted" : "Not submitted", tone: submissionStatus.submitted ? "teal" : locked ? "gray" : "amber" } : null;
  const upcomingDue = !selectedWeek && upcomingWeek?.availabilityDeadline ? `Send ${weekLabel(upcomingWeek.weekStart).toLowerCase()} by ${formatBusinessDateTime(upcomingWeek.availabilityDeadline, workspace.timeZone)}.` : null;
  const notices = <>
    <QuietSegments label="Which week" items={[
      { href: "/app/availability", label: "Usual week", current: !selectedWeek },
      { href: `/app/availability?week=${selectedWeek ?? nextWeek}`, label: weekLabel(selectedWeek ?? nextWeek), current: !!selectedWeek },
    ]} />
    {params.error ? <p className="q-help q-help--alert" role="alert">
      {params.error === "locked"
        ? "The availability deadline for this week has passed."
        : params.error === "concurrent"
          ? "Your availability changed while saving. Review this week and try again."
          : params.error === "invalid_week"
          ? "That schedule week is not valid."
          : "Every available day needs a valid start and end time."}
    </p> : null}
    {params.saved ? <p className="q-help" role="status">{selectedWeek ? "Your availability for this schedule week has been updated." : "Your usual week has been updated."}</p> : null}
  </>;

  return (
    <QuietPage className="q-avail">
      <AvailabilitySignatureEditor
        key={selectedWeek ?? "normal"}
        initialAvailability={initialAvailability}
        weekStart={selectedWeek}
        locked={locked}
        status={status}
        header={{ title: "Availability", sub: selectedWeek ? keepWhole(formatWeekRange(selectedWeek)) : "Your usual week" }}
        notices={notices}
        after={selectedWeek
          ? (locked ? "The deadline passed. Your submitted hours are kept." : deadline ? `Send it by ${inZone(deadline, { weekday: "long", month: "short", day: "numeric" })}. Your usual week stays the same.` : "Hours for this week only. Your usual week stays the same.")
          : upcomingDue ?? "Your saved usual week."}
      />
    </QuietPage>
  );
}
