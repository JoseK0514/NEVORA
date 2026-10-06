import { Temporal } from "@js-temporal/polyfill";
import type {
  AttendanceCoverage,
  AttendanceEntryStatus,
  HistoricalShift,
  RecordedBreak,
  RecordedEntry,
  UnavailableProjection,
  ValidatedAttendanceSource,
} from "./types";

const ENTRY_LIMIT = 500;
const BREAK_LIMIT = 5_000;
const PUBLICATION_LIMIT = 500;

const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const safeText = (value: unknown, max = 100): value is string =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.length <= max &&
  !/[\u0000-\u001f\u007f]/.test(value);

const positiveInteger = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isSafeInteger(value) &&
  value >= 1;

const unavailable = (
  reason: UnavailableProjection["reason"],
): UnavailableProjection => ({ state: "unavailable", reason });

function validObservedAt(value: unknown): value is string {
  if (!safeText(value, 100)) return false;
  try {
    Temporal.Instant.from(value);
    return true;
  } catch {
    return false;
  }
}

function validTimeZone(value: unknown, observedAt: string): value is string {
  if (!safeText(value, 100)) return false;
  try {
    Temporal.Instant.from(observedAt).toZonedDateTimeISO(value);
    return true;
  } catch {
    return false;
  }
}

function copyCoverage(value: unknown): AttendanceCoverage | null {
  if (!object(value)) return null;
  if (
    typeof value.entriesComplete !== "boolean" ||
    typeof value.breaksComplete !== "boolean" ||
    typeof value.publicationsComplete !== "boolean"
  ) {
    return null;
  }
  return {
    entriesComplete: value.entriesComplete,
    breaksComplete: value.breaksComplete,
    publicationsComplete: value.publicationsComplete,
  };
}

function copyBreak(
  value: unknown,
  entryId: string,
): RecordedBreak | null {
  if (!object(value)) return null;
  if (
    !safeText(value.id) ||
    value.timeEntryId !== entryId ||
    !safeText(value.startAt, 100) ||
    !(value.endAt === null || safeText(value.endAt, 100)) ||
    !(value.breakTypeId === null || safeText(value.breakTypeId))
  ) {
    return null;
  }
  return {
    id: value.id,
    timeEntryId: entryId,
    startAt: value.startAt,
    endAt: value.endAt as string | null,
    breakTypeId: value.breakTypeId as string | null,
    breakTypeSnapshot: value.breakTypeSnapshot,
  };
}

function copyEntry(
  value: unknown,
  workspaceId: string,
  breakIds: Set<string>,
): RecordedEntry | null {
  if (!object(value) || !Array.isArray(value.breaks)) return null;
  if (
    !safeText(value.id) ||
    value.workspaceId !== workspaceId ||
    !safeText(value.employeeId) ||
    !safeText(value.locationId) ||
    !positiveInteger(value.sourceVersion) ||
    !safeText(value.clockInAt, 100) ||
    !(value.clockOutAt === null || safeText(value.clockOutAt, 100)) ||
    !["CLOCKED_IN", "ON_BREAK", "CLOCKED_OUT"].includes(
      String(value.status),
    )
  ) {
    return null;
  }

  const breaks: RecordedBreak[] = [];
  for (const raw of value.breaks) {
    const copied = copyBreak(raw, value.id);
    if (!copied || breakIds.has(copied.id)) return null;
    breakIds.add(copied.id);
    breaks.push(copied);
  }

  return {
    id: value.id,
    workspaceId,
    employeeId: value.employeeId,
    locationId: value.locationId,
    sourceVersion: value.sourceVersion,
    clockInAt: value.clockInAt,
    clockOutAt: value.clockOutAt as string | null,
    status: value.status as AttendanceEntryStatus,
    scheduleContext: value.scheduleContext,
    breaks,
  };
}

function copyHistoricalShift(
  value: unknown,
  workspaceId: string,
): HistoricalShift | null {
  if (!object(value)) return null;
  if (
    value.workspaceId !== workspaceId ||
    !safeText(value.employeeId) ||
    !safeText(value.locationId) ||
    !safeText(value.revisionId) ||
    !positiveInteger(value.revisionNumber) ||
    !safeText(value.publishedShiftId) ||
    !safeText(value.scheduleId) ||
    !(value.sourceShiftId === null || safeText(value.sourceShiftId)) ||
    !safeText(value.date, 40) ||
    !safeText(value.startTime, 40) ||
    !safeText(value.endTime, 40) ||
    typeof value.isCalloutApproved !== "boolean"
  ) {
    return null;
  }
  return {
    workspaceId,
    employeeId: value.employeeId,
    locationId: value.locationId,
    revisionId: value.revisionId,
    revisionNumber: value.revisionNumber,
    publishedShiftId: value.publishedShiftId,
    scheduleId: value.scheduleId,
    sourceShiftId: value.sourceShiftId as string | null,
    date: value.date,
    startTime: value.startTime,
    endTime: value.endTime,
    isCalloutApproved: value.isCalloutApproved,
  };
}

export function validateAttendanceSource(
  value: unknown,
): ValidatedAttendanceSource | UnavailableProjection {
  if (
    !object(value) ||
    value.version !== 1 ||
    !safeText(value.workspaceId) ||
    !validObservedAt(value.observedAt) ||
    !Array.isArray(value.entries) ||
    !Array.isArray(value.publications)
  ) {
    return unavailable("invalid_source");
  }

  const coverage = copyCoverage(value.coverage);
  if (
    !coverage ||
    !validTimeZone(value.timeZone, value.observedAt)
  ) {
    return unavailable("invalid_source");
  }

  if (!coverage.entriesComplete || !coverage.breaksComplete) {
    return unavailable("incomplete_source");
  }

  if (
    value.entries.length > ENTRY_LIMIT ||
    value.publications.length > PUBLICATION_LIMIT
  ) {
    return unavailable("source_limit");
  }

  let breakCount = 0;
  for (const raw of value.entries) {
    if (object(raw) && Array.isArray(raw.breaks)) {
      breakCount += raw.breaks.length;
      if (breakCount > BREAK_LIMIT) return unavailable("source_limit");
    }
  }

  const entryIds = new Set<string>();
  const breakIds = new Set<string>();
  const entries: RecordedEntry[] = [];
  for (const raw of value.entries) {
    const entry = copyEntry(raw, value.workspaceId, breakIds);
    if (!entry || entryIds.has(entry.id)) {
      return unavailable("invalid_source");
    }
    entryIds.add(entry.id);
    entries.push(entry);
  }

  const publicationIds = new Set<string>();
  const publications: HistoricalShift[] = [];
  for (const raw of value.publications) {
    const shift = copyHistoricalShift(raw, value.workspaceId);
    if (!shift || publicationIds.has(shift.publishedShiftId)) {
      return unavailable("invalid_source");
    }
    publicationIds.add(shift.publishedShiftId);
    publications.push(shift);
  }

  return {
    version: 1,
    workspaceId: value.workspaceId,
    timeZone: value.timeZone,
    observedAt: value.observedAt,
    entries,
    publications,
    coverage,
  };
}
