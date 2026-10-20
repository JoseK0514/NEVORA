import { getWorkspace } from "@/lib/data/workspaces";
import { keepWhole } from "@/lib/keep-whole";
import { FilterPills, PageBand } from "@/components/kit/kit";
import { businessDate, formatBusinessDateTime } from "@/lib/business-time";
import Link from "next/link";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { AvailabilityFeedback } from "@/components/availability-feedback";
import "./availability.css";
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

  return (
    <div className="nv-page availability-page employee-view employee-availability-view premium-employee-availability" data-nv-page="">
      {/* Phase 3 + Codex M5: the band names the scope, and "Usual week | Specific week" is a visible switch. */}
      <PageBand title="Availability" overlap={false}
        summary={selectedWeek ? `Changes here apply only to ${keepWhole(formatWeekRange(selectedWeek))}.` : "Your usual week. Let your team know when you can work."}
        extra={<FilterPills label="Availability scope" items={[
          { href: "/app/availability", label: "Usual week", current: !selectedWeek },
          { href: `/app/availability?week=${selectedWeek ?? upcomingWeek?.weekStart ?? addDays(currentWeek, 7)}`, label: "Specific week", current: Boolean(selectedWeek) },
        ]} />} />
      <div className="premium-employee-content">

      {/* Phase 3: for the usual week the band already says what this page edits; the context card is for a specific week. */}
      {selectedWeek ? <section className="av-week-panel" aria-label="Weekly availability context">
        <div className="av-week-context"><span className="av-icon-tile"><CalendarBlankIcon size={24} aria-hidden="true" /></span><div><p>{selectedWeek ? "Weekly submission" : "Normal availability"}</p><strong>{selectedWeek ? formatWeekRange(selectedWeek) : "Your usual week"}</strong><span>{selectedWeek ? "These hours apply to this schedule week." : "Your regular hours. Submit separately for a specific week."}</span></div></div>
        {selectedWeek ? <div className={`av-deadline${locked ? " locked" : ""}`}><ClockIcon size={20} aria-hidden="true" /><div><strong>{locked ? "Submissions closed" : "Availability deadline"}</strong><p>{settings?.availabilityDeadline ? formatBusinessDateTime(settings.availabilityDeadline, workspace.timeZone) : "No deadline set"}</p><span>{locked ? "This week’s submitted hours are locked." : settings?.availabilityDeadline ? "You can update your submission until the deadline." : "No deadline has been set for this week."}</span></div></div> : null}
        {selectedWeek && submissionStatus && submissionCopy ? <div className={`av-submission-detail${submissionStatus.submitted ? " submitted" : ""}`}><strong>{submissionCopy.label}</strong><p>{submissionCopy.detail}</p>{submissionStatus.updatedAt ? <small>Last updated {keepWhole(formatBusinessDateTime(submissionStatus.updatedAt, workspace.timeZone))}</small> : null}</div> : null}
      </section> : null}

      {/* Codex mobile review M5: a specific week is always reachable, with or without a cutoff. */}
      {/* The pills always reach a specific week (M5); this card only appears when a real deadline is coming. */}
      {!selectedWeek && upcomingWeek?.availabilityDeadline ? (
        <section className="av-upcoming-banner">
          <div>
            <p>{upcomingWeek?.availabilityDeadline ? "Upcoming schedule" : "A specific week"}</p>
            <strong>{keepWhole(formatWeekRange(upcomingWeek?.weekStart ?? addDays(currentWeek, 7)))}</strong>
            <span>
              {upcomingWeek?.availabilityDeadline
                ? <>Availability closes {formatBusinessDateTime(upcomingWeek.availabilityDeadline, workspace.timeZone)}.</>
                : "Different hours for one week? Submit them here. Your usual week stays the same."}
            </span>
          </div>
          <Link
            className="av-button primary"
            href={`/app/availability?week=${upcomingWeek?.weekStart ?? addDays(currentWeek, 7)}`}
          >
            Submit for this week<ArrowRightIcon size={18} aria-hidden="true" />
          </Link>
        </section>
      ) : null}

      {params.error ? (
        <AvailabilityFeedback error>
          {params.error === "locked"
            ? "The availability deadline for this week has passed."
            : params.error === "concurrent"
              ? "Your availability changed while saving. Review this week and try again."
              : params.error === "invalid_week"
              ? "That schedule week is not valid."
              : "Every available day needs a valid start and end time."}
        </AvailabilityFeedback>
      ) : null}

      {params.saved ? (
        <AvailabilityFeedback>
          {selectedWeek
            ? "Your availability for this schedule week has been updated."
            : "Your normal weekly availability has been updated."}
        </AvailabilityFeedback>
      ) : null}

      <AvailabilityEditor
        key={selectedWeek ?? "normal"}
        initialAvailability={initialAvailability}
        weekStart={selectedWeek}
        locked={locked}
        employeeView
      />
      </div>
    </div>
  );
}
