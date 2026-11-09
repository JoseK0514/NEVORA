import { Temporal } from "@js-temporal/polyfill";
import type {
  HistoricalShift,
  RecordedEntry,
  ScheduleEvidence,
  ValidatedAttendanceSource,
} from "./types";

const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const text = (value: unknown, max = 100): value is string =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.length <= max &&
  !/[\u0000-\u001f\u007f]/.test(value);

const nonnegativeInteger = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isSafeInteger(value) &&
  value >= 0;

const positiveInteger = (value: unknown): value is number =>
  nonnegativeInteger(value) && value >= 1;

const notEvaluated = (
  reason: Extract<ScheduleEvidence, { state: "not_evaluated" }>["reason"],
): ScheduleEvidence => ({ state: "not_evaluated", reason });

function sameInstant(left: unknown, right: unknown): boolean {
  if (!text(left, 100) || !text(right, 100)) return false;
  try {
    return (
      Temporal.Instant.compare(
        Temporal.Instant.from(left),
        Temporal.Instant.from(right),
      ) === 0
    );
  } catch {
    return false;
  }
}

function validTimeZone(value: unknown): value is string {
  if (!text(value, 100)) return false;
  try {
    Temporal.Instant.from("2000-01-01T00:00:00Z").toZonedDateTimeISO(value);
    return true;
  } catch {
    return false;
  }
}

function reviewedRevisions(value: unknown): value is string[] {
  if (!Array.isArray(value)) return false;
  const seen = new Set<string>();
  for (const item of value) {
    if (!text(item) || seen.has(item)) return false;
    seen.add(item);
  }
  return true;
}

function localBoundary(
  date: Temporal.PlainDate,
  time: string,
  end: boolean,
): Temporal.PlainDateTime {
  if (!/^\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?$/.test(time)) {
    throw new Error("invalid_boundary");
  }
  if (end && /^24:00(?::00(?:\.0{1,6})?)?$/.test(time)) {
    return date.add({ days: 1 }).toPlainDateTime("00:00");
  }
  const hour = Number(time.slice(0, 2));
  const minute = Number(time.slice(3, 5));
  const second = Number(time.slice(6, 8) || 0);
  if (hour > 23 || minute > 59 || second > 59) {
    throw new Error("invalid_boundary");
  }
  return date.toPlainDateTime(Temporal.PlainTime.from(time));
}

function scheduledInstants(
  shift: HistoricalShift,
  timeZone: string,
):
  | { state: "ready"; startAt: string; endAt: string }
  | { state: "invalid" }
  | { state: "unresolved" } {
  let start: Temporal.PlainDateTime;
  let end: Temporal.PlainDateTime;
  try {
    const date = Temporal.PlainDate.from(shift.date);
    start = localBoundary(date, shift.startTime, false);
    end = localBoundary(date, shift.endTime, true);
    const plainOrder = Temporal.PlainDateTime.compare(end, start);
    if (plainOrder === 0) return { state: "invalid" };
    if (plainOrder < 0) end = end.add({ days: 1 });
  } catch {
    return { state: "invalid" };
  }

  try {
    const startAt = start
      .toZonedDateTime(timeZone, { disambiguation: "reject" })
      .toInstant()
      .toString();
    const endAt = end
      .toZonedDateTime(timeZone, { disambiguation: "reject" })
      .toInstant()
      .toString();
    if (Temporal.Instant.compare(startAt, endAt) >= 0) {
      return { state: "invalid" };
    }
    return { state: "ready", startAt, endAt };
  } catch {
    return { state: "unresolved" };
  }
}

function matchedEvidence(
  source: ValidatedAttendanceSource,
  entry: RecordedEntry,
  context: Record<string, unknown>,
): ScheduleEvidence {
  if (
    context.candidateCount !== 1 ||
    context.reason !== null ||
    !object(context.match)
  ) {
    return notEvaluated("schedule_context_invalid");
  }

  const match = context.match;
  if (
    !text(match.revisionId) ||
    !positiveInteger(match.revisionNumber) ||
    !text(match.publishedShiftId) ||
    !text(match.scheduleId) ||
    !(match.sourceShiftId === null || text(match.sourceShiftId)) ||
    !(match.positionId === null || text(match.positionId)) ||
    !(match.positionName === null || text(match.positionName, 80)) ||
    !(context.reviewedRevisionIds as string[]).includes(match.revisionId)
  ) {
    return notEvaluated("schedule_context_invalid");
  }

  const shift = source.publications.find(
    (candidate) => candidate.publishedShiftId === match.publishedShiftId,
  );
  if (!shift) {
    return notEvaluated(
      source.coverage.publicationsComplete
        ? "schedule_reference_missing"
        : "publication_source_incomplete",
    );
  }

  if (
    shift.workspaceId !== source.workspaceId ||
    shift.employeeId !== entry.employeeId ||
    shift.locationId !== entry.locationId ||
    shift.revisionId !== match.revisionId ||
    shift.revisionNumber !== match.revisionNumber ||
    shift.scheduleId !== match.scheduleId ||
    shift.sourceShiftId !== match.sourceShiftId ||
    shift.isCalloutApproved
  ) {
    return notEvaluated("schedule_reference_invalid");
  }

  const instants = scheduledInstants(shift, context.timeZone as string);
  if (instants.state === "invalid") {
    return notEvaluated("schedule_reference_invalid");
  }
  if (instants.state === "unresolved") {
    return notEvaluated("schedule_time_unresolved");
  }

  try {
    const clockIn = Temporal.Instant.from(entry.clockInAt);
    if (
      Temporal.Instant.compare(clockIn, instants.startAt) < 0 ||
      Temporal.Instant.compare(clockIn, instants.endAt) >= 0
    ) {
      return notEvaluated("schedule_reference_invalid");
    }
  } catch {
    return notEvaluated("schedule_context_invalid");
  }

  return {
    state: "matched",
    startAt: instants.startAt,
    endAt: instants.endAt,
    timeZone: context.timeZone as string,
    revisionId: shift.revisionId,
    publishedShiftId: shift.publishedShiftId,
  };
}

/**
 * Resolve only the publication evidence captured at clock-in; never rematch a
 * record against today's schedule. Identity, revision and interval must all
 * agree. Missing/invalid evidence yields a comparison limitation, while a saved
 * unmatched/ambiguous result preserves the historical matching outcome.
 */
export function resolveHistoricalSchedule(
  source: ValidatedAttendanceSource,
  entry: RecordedEntry,
): ScheduleEvidence {
  const context = entry.scheduleContext;
  if (context === null) {
    return notEvaluated("schedule_not_captured");
  }
  if (
    !object(context) ||
    context.version !== 1 ||
    !validTimeZone(context.timeZone) ||
    !sameInstant(context.capturedAt, entry.clockInAt) ||
    !nonnegativeInteger(context.candidateCount) ||
    !reviewedRevisions(context.reviewedRevisionIds)
  ) {
    return notEvaluated("schedule_context_invalid");
  }

  if (context.status === "MATCHED") {
    return matchedEvidence(source, entry, context);
  }

  if (
    context.status === "UNMATCHED" &&
    context.candidateCount === 0 &&
    context.reason === "NO_MATCH" &&
    context.match === null
  ) {
    return { state: "unmatched", reason: "NO_MATCH" };
  }

  if (
    context.status === "AMBIGUOUS" &&
    context.candidateCount > 0 &&
    context.match === null &&
    ((context.reason === "OVERLAPPING_SHIFTS" && context.candidateCount > 1) ||
      context.reason === "UNRESOLVED_LOCAL_TIME")
  ) {
    return { state: "ambiguous", reason: context.reason };
  }

  return notEvaluated("schedule_context_invalid");
}
