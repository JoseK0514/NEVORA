import { Temporal } from "@js-temporal/polyfill";
import { resolveHistoricalSchedule } from "./historical-schedule";
import type {
  AttendanceGroup,
  AttendanceProjection,
  ComparisonLimitation,
  DeferredCapability,
  Observation,
  ObservationEvidence,
  ObservationKind,
  RecordedBreak,
  RecordedEntry,
  ValidatedAttendanceSource,
} from "./types";
import { validateAttendanceSource } from "./validation";

const KIND_ORDER: readonly ObservationKind[] = [
  "TIME_HISTORY_INCONSISTENT",
  "SCHEDULE_UNMATCHED",
  "SCHEDULE_AMBIGUOUS",
  "CLOCK_IN_AFTER_SCHEDULE_START",
  "CLOCK_OUT_BEFORE_SCHEDULE_END",
  "OPEN_AFTER_SCHEDULE_END",
  "BREAK_TARGET_EXCEEDED",
];

const DEFERRED_CAPABILITIES: readonly DeferredCapability[] = [
  "missing_clock_in",
  "policy_lateness",
  "policy_early_departure",
  "unusually_long_entry",
  "correction_review",
  "overtime_risk",
];

type EntryHistory = {
  entry: RecordedEntry;
  start: Temporal.Instant | null;
  end: Temporal.Instant | null;
  open: boolean;
  inconsistent: boolean;
};

const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const text = (value: unknown, max = 100): value is string =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.length <= max &&
  !/[\u0000-\u001f\u007f]/.test(value);

const positiveInteger = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isSafeInteger(value) &&
  value >= 1;

function instant(value: string): Temporal.Instant | null {
  try {
    return Temporal.Instant.from(value);
  } catch {
    return null;
  }
}

function stableObservationId(
  workspaceId: string,
  entryId: string,
  kind: ObservationKind,
  breakId: string | null,
): string {
  return JSON.stringify([1, workspaceId, entryId, kind, breakId]);
}

function observation(
  source: ValidatedAttendanceSource,
  entry: RecordedEntry,
  kind: ObservationKind,
  message: string,
  evidence: ObservationEvidence,
  breakId: string | null = null,
): Observation {
  return {
    id: stableObservationId(
      source.workspaceId,
      entry.id,
      kind,
      breakId,
    ),
    kind,
    breakId,
    message,
    evidence,
  };
}

function limitationKey(value: ComparisonLimitation): string {
  return JSON.stringify([value.entryId, value.breakId, value.reason]);
}

function addLimitation(
  limitations: Map<string, ComparisonLimitation>,
  value: ComparisonLimitation,
): void {
  limitations.set(limitationKey(value), value);
}

function compareCodePoint(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function analyzeEntry(
  entry: RecordedEntry,
  observedAt: Temporal.Instant,
): EntryHistory {
  const start = instant(entry.clockInAt);
  const open = entry.clockOutAt === null;
  const end = open ? observedAt : instant(entry.clockOutAt as string);
  let inconsistent =
    start === null ||
    end === null ||
    (start !== null &&
      Temporal.Instant.compare(start, observedAt) > 0) ||
    (end !== null &&
      Temporal.Instant.compare(end, observedAt) > 0) ||
    (start !== null &&
      end !== null &&
      Temporal.Instant.compare(end, start) < 0) ||
    (open && entry.status === "CLOCKED_OUT") ||
    (!open && entry.status !== "CLOCKED_OUT");

  type BreakInterval = {
    start: Temporal.Instant;
    end: Temporal.Instant;
    open: boolean;
  };
  const intervals: BreakInterval[] = [];
  let openBreaks = 0;

  for (const recordedBreak of entry.breaks) {
    const breakStart = instant(recordedBreak.startAt);
    const breakOpen = recordedBreak.endAt === null;
    const breakEnd = breakOpen
      ? observedAt
      : instant(recordedBreak.endAt as string);
    if (breakOpen) openBreaks += 1;

    if (
      breakStart === null ||
      breakEnd === null ||
      start === null ||
      end === null ||
      Temporal.Instant.compare(breakStart, observedAt) > 0 ||
      Temporal.Instant.compare(breakEnd, observedAt) > 0 ||
      Temporal.Instant.compare(breakEnd, breakStart) < 0 ||
      Temporal.Instant.compare(breakStart, start) < 0 ||
      Temporal.Instant.compare(breakEnd, end) > 0 ||
      (!open && breakOpen)
    ) {
      inconsistent = true;
      continue;
    }

    intervals.push({
      start: breakStart,
      end: breakEnd,
      open: breakOpen,
    });
  }

  intervals.sort((left, right) =>
    Temporal.Instant.compare(left.start, right.start),
  );
  for (let index = 1; index < intervals.length; index += 1) {
    if (
      Temporal.Instant.compare(
        intervals[index].start,
        intervals[index - 1].end,
      ) < 0
    ) {
      inconsistent = true;
    }
  }

  if (
    openBreaks > 1 ||
    (entry.status === "ON_BREAK" && openBreaks !== 1) ||
    (entry.status !== "ON_BREAK" && openBreaks !== 0)
  ) {
    inconsistent = true;
  }

  return { entry, start, end, open, inconsistent };
}

function markCrossEntryConflicts(histories: EntryHistory[]): void {
  const byEmployee = new Map<string, EntryHistory[]>();
  for (const history of histories) {
    const list = byEmployee.get(history.entry.employeeId) ?? [];
    list.push(history);
    byEmployee.set(history.entry.employeeId, list);
  }

  for (const employeeHistories of byEmployee.values()) {
    for (let leftIndex = 0; leftIndex < employeeHistories.length; leftIndex += 1) {
      const left = employeeHistories[leftIndex];
      if (!left.start || !left.end) continue;
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < employeeHistories.length;
        rightIndex += 1
      ) {
        const right = employeeHistories[rightIndex];
        if (!right.start || !right.end) continue;
        const overlaps =
          Temporal.Instant.compare(left.start, right.end) < 0 &&
          Temporal.Instant.compare(right.start, left.end) < 0;
        if (overlaps) {
          left.inconsistent = true;
          right.inconsistent = true;
        }
      }
    }
  }
}

function inObservationScope(
  history: EntryHistory,
  dayStart: Temporal.Instant,
  observedAt: Temporal.Instant,
): boolean {
  if (!history.start || !history.end) return true;
  if (history.open) return true;
  return (
    Temporal.Instant.compare(history.end, dayStart) > 0 &&
    Temporal.Instant.compare(history.start, observedAt) <= 0
  );
}

function positiveDifference(
  later: Temporal.Instant,
  earlier: Temporal.Instant,
): string | null {
  const value = later.epochNanoseconds - earlier.epochNanoseconds;
  return value > BigInt(0) ? value.toString() : null;
}

function breakTarget(
  recordedBreak: RecordedBreak,
):
  | { state: "configured"; targetMinutes: number }
  | { state: "not_captured" }
  | { state: "invalid" } {
  if (
    recordedBreak.breakTypeId === null &&
    recordedBreak.breakTypeSnapshot === null
  ) {
    return { state: "not_captured" };
  }
  if (
    recordedBreak.breakTypeId === null ||
    !object(recordedBreak.breakTypeSnapshot)
  ) {
    return { state: "invalid" };
  }
  const snapshot = recordedBreak.breakTypeSnapshot;
  if (
    snapshot.id !== recordedBreak.breakTypeId ||
    !positiveInteger(snapshot.version) ||
    !text(snapshot.name, 80) ||
    !["REST", "MEAL", "OTHER"].includes(String(snapshot.category))
  ) {
    return { state: "invalid" };
  }
  if (snapshot.targetMinutes === null) {
    return { state: "not_captured" };
  }
  if (
    !positiveInteger(snapshot.targetMinutes) ||
    snapshot.targetMinutes > 1_440
  ) {
    return { state: "invalid" };
  }
  return {
    state: "configured",
    targetMinutes: snapshot.targetMinutes,
  };
}

function sortObservations(observations: Observation[]): void {
  observations.sort((left, right) => {
    const kind =
      KIND_ORDER.indexOf(left.kind) - KIND_ORDER.indexOf(right.kind);
    if (kind !== 0) return kind;
    return compareCodePoint(left.breakId ?? "", right.breakId ?? "");
  });
}

function scheduleObservation(
  source: ValidatedAttendanceSource,
  entry: RecordedEntry,
  observedAt: Temporal.Instant,
  limitations: Map<string, ComparisonLimitation>,
): Observation[] {
  const schedule = resolveHistoricalSchedule(source, entry);
  if (schedule.state === "unmatched") {
    return [
      observation(
        source,
        entry,
        "SCHEDULE_UNMATCHED",
        "No schedule match recorded.",
        { reason: schedule.reason },
      ),
    ];
  }
  if (schedule.state === "ambiguous") {
    return [
      observation(
        source,
        entry,
        "SCHEDULE_AMBIGUOUS",
        "Schedule match needs review.",
        { reason: schedule.reason },
      ),
    ];
  }
  if (schedule.state === "not_evaluated") {
    addLimitation(limitations, {
      entryId: entry.id,
      breakId: null,
      reason: schedule.reason,
    });
    return [];
  }

  const actualStart = Temporal.Instant.from(entry.clockInAt);
  const scheduledStart = Temporal.Instant.from(schedule.startAt);
  const scheduledEnd = Temporal.Instant.from(schedule.endAt);
  const observations: Observation[] = [];

  const late = positiveDifference(actualStart, scheduledStart);
  if (late) {
    observations.push(
      observation(
        source,
        entry,
        "CLOCK_IN_AFTER_SCHEDULE_START",
        "Clock-in recorded after scheduled start.",
        {
          recordedAt: entry.clockInAt,
          expectedAt: schedule.startAt,
          differenceNanoseconds: late,
          revisionId: schedule.revisionId,
          publishedShiftId: schedule.publishedShiftId,
        },
      ),
    );
  }

  if (entry.clockOutAt !== null) {
    const actualEnd = Temporal.Instant.from(entry.clockOutAt);
    const early = positiveDifference(scheduledEnd, actualEnd);
    if (early) {
      observations.push(
        observation(
          source,
          entry,
          "CLOCK_OUT_BEFORE_SCHEDULE_END",
          "Clock-out recorded before scheduled end.",
          {
            recordedAt: entry.clockOutAt,
            expectedAt: schedule.endAt,
            differenceNanoseconds: early,
            revisionId: schedule.revisionId,
            publishedShiftId: schedule.publishedShiftId,
          },
        ),
      );
    }
  } else {
    const afterEnd = positiveDifference(observedAt, scheduledEnd);
    if (afterEnd) {
      observations.push(
        observation(
          source,
          entry,
          "OPEN_AFTER_SCHEDULE_END",
          "No clock-out recorded · scheduled end passed.",
          {
            recordedAt: source.observedAt,
            expectedAt: schedule.endAt,
            differenceNanoseconds: afterEnd,
            revisionId: schedule.revisionId,
            publishedShiftId: schedule.publishedShiftId,
          },
        ),
      );
    }
  }

  return observations;
}

function breakObservations(
  source: ValidatedAttendanceSource,
  entry: RecordedEntry,
  observedAt: Temporal.Instant,
  limitations: Map<string, ComparisonLimitation>,
): Observation[] {
  const observations: Observation[] = [];
  for (const recordedBreak of entry.breaks) {
    if (recordedBreak.endAt !== null) continue;
    const target = breakTarget(recordedBreak);
    if (target.state !== "configured") {
      addLimitation(limitations, {
        entryId: entry.id,
        breakId: recordedBreak.id,
        reason:
          target.state === "not_captured"
            ? "break_target_not_captured"
            : "break_target_invalid",
      });
      continue;
    }

    const start = Temporal.Instant.from(recordedBreak.startAt);
    const expected = start.add({ minutes: target.targetMinutes });
    const difference = positiveDifference(observedAt, expected);
    if (!difference) continue;

    observations.push(
      observation(
        source,
        entry,
        "BREAK_TARGET_EXCEEDED",
        "Open break exceeded saved target.",
        {
          recordedAt: source.observedAt,
          expectedAt: expected.toString(),
          differenceNanoseconds: difference,
          targetMinutes: target.targetMinutes,
        },
        recordedBreak.id,
      ),
    );
  }
  return observations;
}

export function projectAttendance(sourceValue: unknown): AttendanceProjection {
  const source = validateAttendanceSource(sourceValue);
  if ("state" in source) return source;

  const observedAt = Temporal.Instant.from(source.observedAt);
  const zoned = observedAt.toZonedDateTimeISO(source.timeZone);
  const dayStart = zoned.startOfDay().toInstant();
  const histories = source.entries.map((entry) =>
    analyzeEntry(entry, observedAt),
  );
  markCrossEntryConflicts(histories);

  const limitations = new Map<string, ComparisonLimitation>();
  const groups: AttendanceGroup[] = [];

  for (const history of histories) {
    if (!inObservationScope(history, dayStart, observedAt)) continue;
    const entry = history.entry;
    const observations: Observation[] = [];

    if (history.inconsistent) {
      observations.push(
        observation(
          source,
          entry,
          "TIME_HISTORY_INCONSISTENT",
          "Time record needs review.",
          { reason: "time_history_inconsistent" },
        ),
      );
      addLimitation(limitations, {
        entryId: entry.id,
        breakId: null,
        reason: "time_history_inconsistent",
      });
    } else {
      observations.push(
        ...scheduleObservation(
          source,
          entry,
          observedAt,
          limitations,
        ),
      );
      observations.push(
        ...breakObservations(
          source,
          entry,
          observedAt,
          limitations,
        ),
      );
    }

    sortObservations(observations);
    if (observations.length > 0) {
      groups.push({
        entryId: entry.id,
        employeeId: entry.employeeId,
        locationId: entry.locationId,
        sourceVersion: entry.sourceVersion,
        observations,
      });
    }
  }

  groups.sort((left, right) =>
    compareCodePoint(left.entryId, right.entryId),
  );
  const orderedLimitations = [...limitations.values()].sort((left, right) => {
    const entry = compareCodePoint(left.entryId, right.entryId);
    if (entry !== 0) return entry;
    const breakId = compareCodePoint(left.breakId ?? "", right.breakId ?? "");
    if (breakId !== 0) return breakId;
    return compareCodePoint(left.reason, right.reason);
  });

  return {
    state: "ready",
    engineVersion: 1,
    workspaceId: source.workspaceId,
    timeZone: source.timeZone,
    observedAt: source.observedAt,
    scope: {
      kind: "TODAY_AND_OPEN",
      localDate: zoned.toPlainDate().toString(),
      dayStartAt: dayStart.toString(),
    },
    groups,
    recordCount: groups.length,
    signalCount: groups.reduce(
      (total, group) => total + group.observations.length,
      0,
    ),
    affectedEmployeeCount: new Set(
      groups.map((group) => group.employeeId),
    ).size,
    coverage: {
      state: orderedLimitations.length > 0 ? "limited" : "complete",
      limitations: orderedLimitations,
      deferredCapabilities: [...DEFERRED_CAPABILITIES],
    },
  };
}
