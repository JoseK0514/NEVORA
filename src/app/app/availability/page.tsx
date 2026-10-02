import Link from "next/link";
import { ManagerAvailability } from "@/components/manager-availability";
import { AvailabilityEditor } from "@/components/availability-editor";
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
  currentDateInPuertoRico,
  formatPuertoRicoDateTime,
  formatWeekRange,
  weekStartFor,
} from "@/lib/date-utils";
import type { AvailabilityState } from "@/lib/availability-presets";

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function validWeek(value?: string) {
  return (
    value &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    weekStartFor(value) === value
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

function submissionStatusCopy(status: AvailabilitySubmissionStatus) {
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
    detail: "Submit this week before the deadline so management can schedule accurately.",
  };
}

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
  const manager = isManagerRole(session.role);
  const params = await searchParams;
  const currentWeek = weekStartFor(currentDateInPuertoRico());
  if (manager) return ManagerAvailability({ week: params.week, currentWeek, employeeId: params.employeeId });

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
    ? submissionStatusCopy(submissionStatus)
    : null;

  return (
    <div className="availability-page employee-view employee-availability-view">
        <header className="employee-view-heading">
          <div><p className="employee-view-eyebrow">Work preferences</p><h1>Availability</h1>
            <p className="employee-view-description">{selectedWeek ? formatWeekRange(selectedWeek) : "Set the hours you’re available to work."}</p>
          </div>
          {selectedWeek ? <Link className="employee-action" href="/app/availability">Normal availability</Link> : null}
        </header>

      {!selectedWeek && upcomingWeek?.availabilityDeadline ? (
        <section className="availability-deadline-banner">
          <div>
            <p className="eyebrow">Upcoming schedule</p>
            <strong>{formatWeekRange(upcomingWeek.weekStart)}</strong>
            <span>
              Availability closes{" "}
              {formatPuertoRicoDateTime(upcomingWeek.availabilityDeadline)}.
            </span>
          </div>
          <Link
            className="button primary"
            href={`/app/availability?week=${upcomingWeek.weekStart}`}
          >
            Submit for this week
          </Link>
        </section>
      ) : null}

      {selectedWeek && settings?.availabilityDeadline ? (
        <section className={locked ? "availability-deadline-banner locked" : "availability-deadline-banner"}>
          <div>
            <p className="eyebrow">{locked ? "Closed" : "Deadline"}</p>
            <strong>
              {locked ? "Weekly availability is locked" : "Submit before the cutoff"}
            </strong>
            <span>
              {formatPuertoRicoDateTime(settings.availabilityDeadline)}
            </span>
          </div>
        </section>
      ) : null}

      {selectedWeek && submissionStatus && submissionCopy ? (
        <section
          className={
            submissionStatus.submitted
              ? "availability-submission-status submitted"
              : "availability-submission-status pending"
          }
        >
          <div>
            <strong>{submissionCopy.label}</strong>
          </div>
          {submissionStatus.updatedAt ? (
            <small>
              Last updated{" "}
              {formatPuertoRicoDateTime(submissionStatus.updatedAt)}
            </small>
          ) : null}
        </section>
      ) : null}

      {params.error ? (
        <p className="form-error">
          {params.error === "locked"
            ? "The availability deadline for this week has passed."
            : params.error === "concurrent"
              ? "Your availability changed while saving. Review this week and try again."
              : params.error === "invalid_week"
              ? "That schedule week is not valid."
              : "Every available day needs a valid start and end time."}
        </p>
      ) : null}

      {params.saved ? (
        <p className="form-success">
          {selectedWeek
            ? "Your availability for this schedule week has been updated."
            : "Your normal weekly availability has been updated."}
        </p>
      ) : null}

      <AvailabilityEditor
        initialAvailability={initialAvailability}
        weekStart={selectedWeek}
        locked={locked}
        employeeView
      />
    </div>
  );
}
