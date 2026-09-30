import Link from "next/link";
import "./availability-premium.css";
import { AvailabilityEditor } from "@/components/availability-editor";
import { StatusPill } from "@/components/status-pill";
import { requireSession } from "@/lib/auth/session";
import { isManagerRole } from "@/lib/auth/permissions";
import { listAvailability } from "@/lib/data/availability";
import {
  getAvailabilitySubmissionStatus,
  listAvailabilitySubmissionStatuses,
  type AvailabilitySubmissionListItem,
} from "@/lib/data/availability-submissions";
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
          endTime: existing?.endTime ?? "18:00",
        },
      ];
    }),
  ) as AvailabilityState;
}

function managerSubmissionLabel(status: AvailabilitySubmissionListItem) {
  if (!status.submitted) return "Not submitted";
  if (status.windowCount === 0) return "Submitted · unavailable all week";
  return "Submitted";
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
  const selectedWeek = validWeek(params.week) ? params.week! : undefined;

  const [normalAvailability, upcomingWeek] = await Promise.all([
    listAvailability(session.id),
    getUpcomingAvailabilityWeek(currentWeek),
  ]);

  let initialAvailability = buildState(normalAvailability);
  let settings = null;
  let submissionStatus: AvailabilitySubmissionStatus | null = null;
  let managerStatuses: AvailabilitySubmissionListItem[] = [];

  if (selectedWeek) {
    const [weekSettings, weekly, status, teamStatuses] = await Promise.all([
      getWeekSettings(selectedWeek),
      listWeeklyAvailability(session.id, selectedWeek),
      getAvailabilitySubmissionStatus(session.id, selectedWeek),
      manager
        ? listAvailabilitySubmissionStatuses(selectedWeek)
        : Promise.resolve([]),
    ]);
    settings = weekSettings;
    submissionStatus = status;
    managerStatuses = teamStatuses;

    if (settings?.availabilityDeadline) {
      initialAvailability = buildState(weekly);
    } else if (weekly.length) {
      initialAvailability = buildState(weekly);
    }
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
  const managerSubmittedCount = managerStatuses.filter(
    (status) => status.submitted,
  ).length;

  return (
    <div className="availability-page">
      <section className="availability-hero">
        <div className="availability-hero-copy">
          <p>{selectedWeek ? "Weekly availability" : "Availability"}</p>
          <h1>
            {selectedWeek
              ? `Availability · ${formatWeekRange(selectedWeek)}`
              : "Set Your Availability"}
          </h1>
          <span>
            {selectedWeek
              ? "Submit the hours you can work for this specific schedule week."
              : "Set the hours you normally can work. This becomes the baseline for future schedules."}
          </span>
        </div>
        {selectedWeek ? (
          <Link className="button secondary availability-hero-action" href="/app/availability">
            Normal Availability
          </Link>
        ) : null}
      </section>

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
            Submit Weekly Availability
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
            <span>{submissionCopy.detail}</span>
          </div>
          {submissionStatus.updatedAt ? (
            <small>
              Last updated{" "}
              {formatPuertoRicoDateTime(submissionStatus.updatedAt)}
            </small>
          ) : null}
        </section>
      ) : null}

      {manager && selectedWeek ? (
        <section className="panel availability-team-status">
          <div className="availability-team-heading">
            <div>
              <h2>Team Availability</h2>
              <p>
                {managerSubmittedCount}/{managerStatuses.length} active employees
                submitted for this week.
              </p>
            </div>
            <StatusPill
              tone={
                managerSubmittedCount === managerStatuses.length
                  ? "success"
                  : "warning"
              }
            >
              {managerStatuses.length - managerSubmittedCount} missing
            </StatusPill>
          </div>

          <div className="availability-team-list">
            {managerStatuses.map((status) => (
              <div
                className={
                  params.employeeId === status.employeeId
                    ? "availability-team-row selected"
                    : "availability-team-row"
                }
                id={`availability-${status.employeeId}`}
                key={status.employeeId}
              >
                <div>
                  <strong>{status.employeeName}</strong>
                  <span>{status.employeeId}</span>
                </div>
                <div className="availability-team-state">
                  <StatusPill tone={status.submitted ? "success" : "warning"}>
                    {managerSubmissionLabel(status)}
                  </StatusPill>
                  {status.state === "LOCKED" ? <small>Locked</small> : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {params.error ? (
        <p className="form-error">
          {params.error === "locked"
            ? "The availability deadline for this week has passed."
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
      />
    </div>
  );
}
