import { getWorkspace } from "@/lib/data/workspaces";
import { keepWhole } from "@/lib/keep-whole";
import { businessDate, formatBusinessDateTime } from "@/lib/business-time";
import Link from "next/link";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { AvailabilityFeedback } from "@/components/availability-feedback";
import "./availability.css";
import { ManagerAvailability } from "@/components/manager-availability";
import { AvailabilitySignatureEditor, type AvailabilityStatus } from "@/components/availability-signature";
import avs from "@/components/availability-signature.module.css";
import { SigBand, SigPage } from "@/components/signature/signature";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
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

  // Phase 3 (Signature, approved Oct 20, 2026; target docs/product/specs/employee-style/signature/phase-3/p3c-board-a.png):
  // the band leads with the deadline when a week has one; the band pill switches between this week and the usual week.
  const deadline = selectedWeek && settings?.availabilityDeadline ? new Date(settings.availabilityDeadline) : null;
  const today = businessDate(new Date(requestTime), workspace.timeZone);
  const deadlineDay = deadline ? businessDate(deadline, workspace.timeZone) : null;
  const daysLeft = deadlineDay ? Math.round((Date.parse(deadlineDay) - Date.parse(today)) / 86400000) : null;
  const inZone = (date: Date, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: workspace.timeZone, ...options }).format(date);
  const nextWeek = upcomingWeek?.weekStart ?? addDays(currentWeek, 7);
  const status: AvailabilityStatus = submissionStatus && submissionCopy
    ? { label: locked ? (submissionStatus.submitted ? "Locked · submitted" : "Locked") : submissionStatus.submitted ? "Submitted" : "Not submitted", tone: submissionStatus.submitted ? "teal" : locked ? "gray" : "amber" } : null;
  const band = selectedWeek ? (deadline && !locked
    ? <SigBand eyebrow="Availability due"><h1 className="nv-sr">Availability</h1><b className="sg-date">{inZone(deadline, { month: "short", day: "numeric" })}</b>
      <p className="sg-sub"><span>{inZone(deadline, { weekday: "long" })} · for {keepWhole(formatWeekRange(selectedWeek))}</span>{daysLeft !== null && daysLeft >= 0 ? <b>{daysLeft === 0 ? "today" : daysLeft === 1 ? "tomorrow" : `in ${daysLeft} days`}</b> : null}</p>
      <Link className="sg-band-link" href="/app/availability">Usual week<CaretRightIcon size={14} aria-hidden="true" /></Link></SigBand>
    : <SigBand eyebrow={locked ? "Availability · closed" : "Availability"}><h1 className="nv-sr">Availability</h1><p className="sg-word">{keepWhole(formatWeekRange(selectedWeek))}</p>
      <p className="sg-sub"><span>{locked ? "The deadline passed. Your submitted hours are kept." : "Hours for this week only. Your usual week stays the same."}</span></p>
      <Link className="sg-band-link" href="/app/availability">Usual week<CaretRightIcon size={14} aria-hidden="true" /></Link></SigBand>)
    : <SigBand eyebrow="Availability"><h1 className="nv-sr">Availability</h1><p className="sg-word">Your usual week</p>
      <p className="sg-sub"><span>Let your team know when you can work.</span></p>
      <Link className="sg-band-link" href={`/app/availability?week=${nextWeek}`}>Week of {keepWhole(formatWeekRange(nextWeek).split(/\s+[–-]\s+/)[0])}<CaretRightIcon size={14} aria-hidden="true" /></Link></SigBand>;

  return (
    <SigPage className={avs.avPage} band={band}>
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
      {/* Codex mobile review M5: a specific week is always reachable; this card appears when a real deadline is coming. */}
      {!selectedWeek && upcomingWeek?.availabilityDeadline ? <div className="sg-card" data-tone="tint">
        <Link className={avs.avNext} href={`/app/availability?week=${upcomingWeek.weekStart}`}>
          <span className="sg-tile" data-tone="white" aria-hidden="true"><CalendarBlankIcon size={22} /></span>
          <span><b>{keepWhole(formatWeekRange(upcomingWeek.weekStart))}</b><small>Due {formatBusinessDateTime(upcomingWeek.availabilityDeadline, workspace.timeZone)}</small></span>
          <i aria-hidden="true"><ArrowRightIcon size={18} /></i>
          <span className="nv-sr">Submit for this week</span>
        </Link>
      </div> : null}
      <AvailabilitySignatureEditor
        key={selectedWeek ?? "normal"}
        initialAvailability={initialAvailability}
        weekStart={selectedWeek}
        locked={locked}
        status={status}
        after={selectedWeek ? (deadline ? `You can change it until ${inZone(deadline, { weekday: "long" })}. Your usual week stays the same.` : "Your usual week stays the same.") : "Your saved usual week."}
      />
    </SigPage>
  );
}
