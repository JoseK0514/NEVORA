import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { AvailabilityEditor } from "@/components/availability-editor";
import { requireSession } from "@/lib/auth/session";
import { listAvailability } from "@/lib/data/availability";
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

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    saved?: string;
    week?: string;
  }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const currentWeek = weekStartFor(currentDateInPuertoRico());
  const selectedWeek = validWeek(params.week) ? params.week! : undefined;

  const [normalAvailability, upcomingWeek] = await Promise.all([
    listAvailability(session.id),
    getUpcomingAvailabilityWeek(currentWeek),
  ]);

  let initialAvailability = buildState(normalAvailability);
  let settings = null;

  if (selectedWeek) {
    settings = await getWeekSettings(selectedWeek);
    const weekly = await listWeeklyAvailability(session.id, selectedWeek);

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
  return (
    <div className="availability-page">
      <PageHeader
        eyebrow={selectedWeek ? "Weekly availability" : "My scheduling inputs"}
        title={selectedWeek ? `Availability · ${formatWeekRange(selectedWeek)}` : "Availability"}
        description={
          selectedWeek
            ? "Submit the hours you can work for this specific schedule week."
            : "Set the hours you normally can work. This becomes the baseline for future schedules."
        }
        actions={
          selectedWeek ? (
            <Link className="button secondary" href="/app/availability">
              Normal availability
            </Link>
          ) : undefined
        }
      />

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
            Submit weekly availability
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
