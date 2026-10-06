import { Temporal } from '@js-temporal/polyfill';
import { createPrivateSnapshotController } from '../private-snapshot-client';
import type { AttendanceReadUnavailableReason, AttendanceReview } from './read-model';
import type {
  ComparisonLimitation,
  DeferredCapability,
  Observation,
  ObservationEvidence,
  ObservationKind,
} from './types';

export type AttendancePanelState = {
  review: AttendanceReview | null;
  refreshing: boolean;
  paused: boolean;
};

const unavailableReasons = new Set<AttendanceReadUnavailableReason>([
  'invalid_source',
  'incomplete_source',
  'source_limit',
  'access_denied',
  'not_configured',
  'schema_missing',
  'read_failed',
]);

const observationKinds = new Set<ObservationKind>([
  'TIME_HISTORY_INCONSISTENT',
  'SCHEDULE_UNMATCHED',
  'SCHEDULE_AMBIGUOUS',
  'CLOCK_IN_AFTER_SCHEDULE_START',
  'CLOCK_OUT_BEFORE_SCHEDULE_END',
  'OPEN_AFTER_SCHEDULE_END',
  'BREAK_TARGET_EXCEEDED',
]);

const limitationReasons = new Set<ComparisonLimitation['reason']>([
  'schedule_not_captured',
  'schedule_context_invalid',
  'schedule_reference_missing',
  'schedule_reference_invalid',
  'schedule_time_unresolved',
  'publication_source_incomplete',
  'break_target_not_captured',
  'break_target_invalid',
  'time_history_inconsistent',
]);

const deferredCapabilities = new Set<DeferredCapability>([
  'missing_clock_in',
  'policy_lateness',
  'policy_early_departure',
  'unusually_long_entry',
  'correction_review',
  'overtime_risk',
]);

const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const text = (value: unknown, max = 500): value is string =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  value.length <= max &&
  !/[\u0000-\u001f\u007f]/.test(value);

const integer = (value: unknown, minimum = 0): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum;

function fail(): never {
  throw new Error('Invalid attendance review');
}

function instant(value: unknown): string {
  if (!text(value, 100)) return fail();
  Temporal.Instant.from(value);
  return value;
}

function timeZone(value: unknown): string {
  if (!text(value, 100)) return fail();
  Temporal.Instant.from('2000-01-01T00:00:00Z').toZonedDateTimeISO(value);
  return value;
}

function evidence(value: unknown): ObservationEvidence {
  if (!object(value)) return fail();
  const result: ObservationEvidence = {};
  if (value.recordedAt !== undefined) result.recordedAt = instant(value.recordedAt);
  if (value.expectedAt !== undefined) result.expectedAt = instant(value.expectedAt);
  if (value.differenceNanoseconds !== undefined) {
    if (!text(value.differenceNanoseconds, 80) || !/^\d+$/.test(value.differenceNanoseconds)) return fail();
    result.differenceNanoseconds = value.differenceNanoseconds;
  }
  if (value.targetMinutes !== undefined) {
    if (!integer(value.targetMinutes, 1) || value.targetMinutes > 1_440) return fail();
    result.targetMinutes = value.targetMinutes;
  }
  if (value.revisionId !== undefined) {
    if (!text(value.revisionId, 200)) return fail();
    result.revisionId = value.revisionId;
  }
  if (value.publishedShiftId !== undefined) {
    if (!text(value.publishedShiftId, 200)) return fail();
    result.publishedShiftId = value.publishedShiftId;
  }
  if (value.reason !== undefined) {
    if (!text(value.reason, 120)) return fail();
    result.reason = value.reason;
  }
  return result;
}

function observation(value: unknown): Observation {
  if (
    !object(value) ||
    !text(value.id, 500) ||
    !observationKinds.has(value.kind as ObservationKind) ||
    !(value.breakId === null || text(value.breakId, 200)) ||
    !text(value.message, 500)
  ) return fail();

  return {
    id: value.id,
    kind: value.kind as ObservationKind,
    breakId: value.breakId as string | null,
    message: value.message,
    evidence: evidence(value.evidence),
  };
}

function limitation(value: unknown): ComparisonLimitation {
  if (
    !object(value) ||
    !text(value.entryId, 200) ||
    !(value.breakId === null || text(value.breakId, 200)) ||
    !limitationReasons.has(value.reason as ComparisonLimitation['reason'])
  ) return fail();

  return {
    entryId: value.entryId,
    breakId: value.breakId as string | null,
    reason: value.reason as ComparisonLimitation['reason'],
  };
}
/**
 * Validate the private network response before exposing attendance identities or counts.
 * The browser may display only the authorized D1.2 projection; it cannot select scope.
 */
export function parseAttendanceReview(value: unknown): AttendanceReview {
  if (!object(value)) return fail();

  if (value.state === 'unavailable') {
    if (!unavailableReasons.has(value.reason as AttendanceReadUnavailableReason)) return fail();
    return {
      state: 'unavailable',
      reason: value.reason as AttendanceReadUnavailableReason,
    };
  }

  if (
    value.state !== 'ready' ||
    value.engineVersion !== 1 ||
    !text(value.workspaceId, 200) ||
    !integer(value.validForMs, 1) ||
    value.validForMs > 45_000 ||
    !object(value.scope) ||
    value.scope.kind !== 'TODAY_AND_OPEN' ||
    !text(value.scope.localDate, 20) ||
    !object(value.coverage) ||
    !['complete', 'limited'].includes(String(value.coverage.state)) ||
    !Array.isArray(value.groups) ||
    !Array.isArray(value.coverage.limitations) ||
    !Array.isArray(value.coverage.deferredCapabilities)
  ) return fail();

  const observedAt = instant(value.observedAt);
  const zone = timeZone(value.timeZone);
  Temporal.PlainDate.from(value.scope.localDate);
  const dayStartAt = instant(value.scope.dayStartAt);

  const entryIds = new Set<string>();
  const groups = value.groups.map((rawGroup) => {
    if (
      !object(rawGroup) ||
      !text(rawGroup.entryId, 200) ||
      !text(rawGroup.employeeId, 200) ||
      !text(rawGroup.locationId, 200) ||
      !integer(rawGroup.sourceVersion, 1) ||
      !Array.isArray(rawGroup.observations) ||
      rawGroup.observations.length === 0 ||
      entryIds.has(rawGroup.entryId)
    ) return fail();

    entryIds.add(rawGroup.entryId);
    return {
      entryId: rawGroup.entryId,
      employeeId: rawGroup.employeeId,
      locationId: rawGroup.locationId,
      sourceVersion: rawGroup.sourceVersion,
      observations: rawGroup.observations.map(observation),
    };
  });

  const limitations = value.coverage.limitations.map(limitation);
  const deferred = value.coverage.deferredCapabilities.map((capability) => {
    if (!deferredCapabilities.has(capability as DeferredCapability)) return fail();
    return capability as DeferredCapability;
  });
  if (new Set(deferred).size !== deferred.length) return fail();

  const signalCount = groups.reduce((total, group) => total + group.observations.length, 0);
  const affectedEmployeeCount = new Set(groups.map((group) => group.employeeId)).size;
  if (
    value.recordCount !== groups.length ||
    value.signalCount !== signalCount ||
    value.affectedEmployeeCount !== affectedEmployeeCount
  ) return fail();

  return {
    state: 'ready',
    engineVersion: 1,
    workspaceId: value.workspaceId,
    timeZone: zone,
    observedAt,
    validForMs: value.validForMs,
    scope: {
      kind: 'TODAY_AND_OPEN',
      localDate: value.scope.localDate,
      dayStartAt,
    },
    groups,
    recordCount: value.recordCount,
    signalCount: value.signalCount,
    affectedEmployeeCount: value.affectedEmployeeCount,
    coverage: {
      state: value.coverage.state as 'complete' | 'limited',
      limitations,
      deferredCapabilities: deferred,
    },
  };
}

export async function fetchAttendanceReview(
  signal: AbortSignal,
): Promise<AttendanceReview> {
  const response = await fetch('/api/manager/attendance', {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store',
    redirect: 'error',
    signal,
    headers: {
      Accept: 'application/json',
      'X-Nevora-Attendance': '1',
    },
  });

  if (response.status === 401 || response.status === 403) {
    return { state: 'unavailable', reason: 'access_denied' };
  }

  const payload = await response.json().catch(() => null);
  const parsed = parseAttendanceReview(payload);
  if (!response.ok && parsed.state !== 'unavailable') {
    throw new Error('Attendance review unavailable');
  }
  return parsed;
}

export function createAttendanceReviewController(
  changed: (state: AttendancePanelState) => void,
  request: (signal: AbortSignal) => Promise<unknown> = fetchAttendanceReview,
) {
  return createPrivateSnapshotController<AttendanceReview>(
    ({ snapshot, refreshing, paused }) =>
      changed({ review: snapshot, refreshing, paused }),
    request,
    parseAttendanceReview,
    (reason) => ({ state: 'unavailable', reason }),
    () => 'read_failed',
  );
}
