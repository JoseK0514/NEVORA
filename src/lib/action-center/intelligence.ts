import {formatCalendarRange} from '../date-utils';
import { Temporal } from '@js-temporal/polyfill';
import { buildManagerActionItems } from '../assistance/manager-actions';
import { isDateInWeek, isValidWeekStart } from '../date-utils';
import type { ManagerActionItem, ManagerCoverageGapInput, ManagerEmployeeInput, ManagerHourIssueInput,
  ManagerPendingRequestInput } from '../assistance/manager-actions';
import type { Observation, ObservationKind } from '../attendance/types';
import type { TimecardIssue } from '../timecards/project';

/** Pure F1 preparation, held from service/UI integration until full F10/F6.
 * These plain observations NEVER authenticate a caller or construct a proof.
 * The protected adapter must derive current bindings, versions, canonical read
 * permission, permitted fields and COMPLETE source/subject/history footprints
 * from its four canonical readers; it must recheck authority before release.
 * Legacy ManagerActionItem alone lacks these facts and is not accepted here. */
export type SourceKey = 'scheduling' | 'attendance' | 'corrections' | 'timecards';
type Role = 'OWNER' | 'MANAGER' | 'LEAD' | 'EMPLOYEE';
export type IntelligenceBinding = { workspaceId: string; actorId: string; role: Role; sessionVersion: string;
  grantsVersion: string; scopeVersion: string; viewId: string; weekStart: string };
export type ActionMetadata = { id: string; workspaceId: string; version: string; currentVersion: string;
  state: 'ACTIONABLE' | 'RESOLVED' | 'SUPERSEDED'; footprintComplete: boolean; locationIds: string[];
  subjectIds: string[]; readAllowed: boolean; destinationAllowed: boolean; permittedFields: string[];
  /** Actual source deadline/start/revision time only. Never a reminder policy or
   * invented date. Request/correction creation is independently source-bound. */
  deadlineAt: string | null; startAt: string | null; sourceTimestamp: string | null };
type AttendanceFact = { entryId: string; employeeId: string; employeeName: string; locationId: string;
  sourceVersion: number; observations: Pick<Observation, 'id' | 'kind'>[] };
type CorrectionFact = { id: string; employeeId: string; employeeName: string; locationId: string;
  kind: 'ENTRY_BOUNDARY' | 'BREAK_BOUNDARY' | 'MISSING_ENTRY'; status: 'PENDING' | 'APPROVED' | 'REJECTED';
  revision: number; createdAt: string; isSelf: boolean };
type CardFact = { employeeId: string; employeeName: string; startDate: string; endDate: string;
  state: 'DRAFT' | 'APPROVED' | 'FINALIZED' | 'REOPENED' | 'NEEDS_REVIEW'; revision: number; sourceHash: string;
  entries: { locationId: string }[]; history: { occurredAt: string; snapshot: { entries: { locationId: string }[] } }[];
  issues: TimecardIssue[] };
export type ActionFact = { meta: ActionMetadata } & (
  | { kind: 'COVERAGE_GAP'; payload: ManagerCoverageGapInput }
  | { kind: 'HOURS'; payload: ManagerHourIssueInput }
  | { kind: 'REQUEST'; payload: ManagerPendingRequestInput & { employeeId: string } }
  | { kind: 'AVAILABILITY_MISSING' | 'ACKNOWLEDGEMENT_MISSING'; payload: ManagerEmployeeInput }
  | { kind: 'DEADLINE' | 'COVERAGE_RULES'; payload: { configured: boolean } }
  | { kind: 'ATTENDANCE'; payload: AttendanceFact }
  | { kind: 'TIME_CORRECTION'; payload: CorrectionFact }
  | { kind: 'TIMECARD'; payload: CardFact });
export type SourceFailure = 'READ_FAILED' | 'ACCESS_DENIED' | 'SCHEMA_UNAVAILABLE' | 'SOURCE_LIMIT' | 'STALE_SOURCE' | 'INVALID_SOURCE';
export type IntelligenceSource = { source: SourceKey; binding: IntelligenceBinding } & (
  | { state: 'ready'; version: string; observedAt: string; expiresAt: string;
      coverage: 'complete' | 'limited' | 'capped'; rows: ActionFact[] }
  | { state: 'loading' }
  | { state: 'unavailable'; reason: SourceFailure });
export type ActionIntelligenceInput = {
  context: IntelligenceBinding & { now: string; authorityExpiresAt: string; online: boolean; workforceActive: boolean;
    portalState: 'DISABLED' | 'PROOF_PENDING' | 'ENABLED' | 'SUSPENDED'; workspaceActive: boolean;
    membershipCurrent: boolean; sessionCurrent: boolean; grantsCurrent: boolean; actionCenterReadAllowed: boolean;
    timeZone: string; administrativeScope: null | { kind: 'ALL_TENANT'; origin: 'LEGACY_COMPATIBILITY' | 'EXPLICIT_GRANT' }
      | { kind: 'LOCATIONS'; origin: 'EXPLICIT_GRANT'; locationIds: string[] };
    selectedLocationIds: string[]; locations: { id: string; workspaceId: string; active: boolean }[];
    expectedSourceVersions: Record<SourceKey, string | null> };
  sources: IntelligenceSource[];
};
export type IntelligenceItem = { id: string; type: ManagerActionItem['type'] | 'ATTENDANCE' | 'TIME_CORRECTION' | 'TIMECARD';
  category: 'scheduling' | 'requests' | 'timekeeping'; priority: ManagerActionItem['priority']; title: string;
  reason: { code: string; text: string }; source: SourceKey; sourceVersion: string; rowVersion: string; observedAt: string;
  relevantAt: string | null; sourceTimestamp: string | null; nextAction: { label: string; href: string } };
export type IntelligenceSection = { source: SourceKey; label: string; state: 'complete' | 'limited' | 'loading' | 'unavailable';
  observedCount: number | null; reason?: SourceFailure | 'INCOMPLETE_SOURCE';
  retry?: { kind: 'RETRY_SOURCE'; source: SourceKey } };
export type ActionIntelligenceResult =
  | { state: 'unavailable'; reason: 'INVALID_INPUT' | 'ACCESS_DENIED' | 'OFFLINE' | 'SOURCE_LIMIT'; allClear: false }
  | { state: 'loading' | 'unavailable'; allClear: false; sections: IntelligenceSection[] }
  | { state: 'ready' | 'partial'; allClear: boolean; allClearScope: 'AUTHORIZED_CURRENT_SCOPE';
      viewId: string; weekStart: string; locationIds: string[]; validUntil: string; items: IntelligenceItem[];
      counts: { total: number; scheduling: number; requests: number; timekeeping: number }; sections: IntelligenceSection[] };

const SOURCES: SourceKey[] = ['scheduling', 'attendance', 'corrections', 'timecards'];
const LABELS = { scheduling: 'Scheduling and requests', attendance: 'Attendance', corrections: 'Time corrections', timecards: 'Period timecards' };
const BINDINGS = ['workspaceId', 'actorId', 'role', 'sessionVersion', 'grantsVersion', 'scopeVersion', 'viewId', 'weekStart'] as const;
const FAILURES: SourceFailure[] = ['READ_FAILED', 'ACCESS_DENIED', 'SCHEMA_UNAVAILABLE', 'SOURCE_LIMIT', 'STALE_SOURCE', 'INVALID_SOURCE'];
const OBSERVATIONS: ObservationKind[] = ['TIME_HISTORY_INCONSISTENT', 'SCHEDULE_UNMATCHED', 'SCHEDULE_AMBIGUOUS',
  'CLOCK_IN_AFTER_SCHEDULE_START', 'CLOCK_OUT_BEFORE_SCHEDULE_END', 'OPEN_AFTER_SCHEDULE_END', 'BREAK_TARGET_EXCEEDED'];
const ISSUES: TimecardIssue[] = ['period_open', 'open_entry', 'open_break', 'pending_correction', 'overlapping_time'];
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max = 300): v is string => typeof v === 'string' && v.length > 0 && v.length <= max &&
  v.trim() === v && !/[\u0000-\u001f\u007f]/.test(v);
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 10000 && v.every(x => text(x)) && new Set(v).size === v.length;
const enumValue = <T extends string>(v: unknown, values: readonly T[]): v is T => typeof v === 'string' && values.includes(v as T);
const integer = (v: unknown, min = 0): v is number => Number.isSafeInteger(v) && Number(v) >= min;
const instant = (v: unknown): string => { if (!text(v, 100)) throw Error('Invalid instant'); return Temporal.Instant.from(v).toString(); };
const optionalInstant = (v: unknown): string | null => v === null ? null : instant(v);
const date = (v: unknown): string => {
  if (!text(v) || !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw Error('Invalid date');
  Temporal.PlainDate.from(v, { overflow: 'reject' }); return v;
};
const time = (v: unknown): string => {
  if (!text(v) || !/^\d{2}:\d{2}$/.test(v)) throw Error('Invalid time');
  Temporal.PlainTime.from(v, { overflow: 'reject' }); return v;
};
const compareText = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const compareTime = (a: string | null, b: string | null) => a === null ? b === null ? 0 : 1 : b === null ? -1 : Temporal.Instant.compare(a, b);
const unavailable = (reason: 'INVALID_INPUT' | 'ACCESS_DENIED' | 'OFFLINE' | 'SOURCE_LIMIT'): ActionIntelligenceResult =>
  ({ state: 'unavailable', reason, allClear: false });

function contextFrom(value: unknown): ActionIntelligenceInput['context'] {
  if (!record(value) || !BINDINGS.every(key => text(value[key])) || !enumValue(value.role, ['OWNER', 'MANAGER', 'LEAD', 'EMPLOYEE']) ||
    !enumValue(value.portalState, ['DISABLED', 'PROOF_PENDING', 'ENABLED', 'SUSPENDED']) ||
    !['online', 'workforceActive', 'workspaceActive', 'membershipCurrent', 'sessionCurrent', 'grantsCurrent', 'actionCenterReadAllowed'].every(key => typeof value[key] === 'boolean') ||
    !text(value.timeZone, 100) || !strings(value.selectedLocationIds) || !Array.isArray(value.locations) || value.locations.length > 10000 ||
    !record(value.expectedSourceVersions) || !SOURCES.every(key => value.expectedSourceVersions && record(value.expectedSourceVersions) &&
      (value.expectedSourceVersions[key] === null || text(value.expectedSourceVersions[key])))) throw Error('Invalid context');
  instant(value.now); instant(value.authorityExpiresAt); date(value.weekStart);
  if (!isValidWeekStart(value.weekStart as string)) throw Error('Invalid week');
  Temporal.Instant.from(value.now as string).toZonedDateTimeISO(value.timeZone);
  const scope = value.administrativeScope;
  if (scope !== null && (!record(scope) || (scope.kind === 'ALL_TENANT' ? !enumValue(scope.origin, ['LEGACY_COMPATIBILITY', 'EXPLICIT_GRANT']) :
    scope.kind !== 'LOCATIONS' || scope.origin !== 'EXPLICIT_GRANT' || !strings(scope.locationIds)))) throw Error('Invalid scope');
  const ids = new Set<string>();
  for (const location of value.locations) {
    if (!record(location) || !text(location.id) || !text(location.workspaceId) || typeof location.active !== 'boolean' || ids.has(location.id)) throw Error('Invalid locations');
    ids.add(location.id);
  }
  return value as ActionIntelligenceInput['context'];
}

function metadataFrom(value: unknown): ActionMetadata {
  if (!record(value) || !text(value.id, 1000) || !text(value.workspaceId) || !text(value.version) || !text(value.currentVersion) ||
    !enumValue(value.state, ['ACTIONABLE', 'RESOLVED', 'SUPERSEDED']) || !strings(value.locationIds) || !strings(value.subjectIds) ||
    !strings(value.permittedFields) || !['footprintComplete', 'readAllowed', 'destinationAllowed'].every(key => typeof value[key] === 'boolean')) throw Error('Invalid metadata');
  optionalInstant(value.deadlineAt); optionalInstant(value.startAt); optionalInstant(value.sourceTimestamp);
  return value as ActionMetadata;
}

const FIELD_REQUIREMENTS: Record<ActionFact['kind'], string[]> = {
  COVERAGE_GAP: ['schedule'], HOURS: ['schedule', 'employee.identity'], REQUEST: ['request', 'employee.identity'],
  AVAILABILITY_MISSING: ['schedule', 'employee.identity'], ACKNOWLEDGEMENT_MISSING: ['schedule', 'employee.identity'],
  DEADLINE: ['configuration'], COVERAGE_RULES: ['configuration'], ATTENDANCE: ['attendance', 'employee.identity'],
  TIME_CORRECTION: ['attendance', 'employee.identity'], TIMECARD: ['timecard', 'employee.identity'],
};
const sourceOf = (kind: ActionFact['kind']): SourceKey => kind === 'ATTENDANCE' ? 'attendance' : kind === 'TIME_CORRECTION' ? 'corrections' : kind === 'TIMECARD' ? 'timecards' : 'scheduling';
function canonicalId(kind: ActionFact['kind'], payload: Record<string, unknown>): string {
  switch (kind) {
    case 'COVERAGE_GAP': return 'COVERAGE:' + payload.key;
    case 'HOURS': return 'HOURS:' + payload.employeeId;
    case 'REQUEST': return payload.kind + ':' + payload.id;
    case 'AVAILABILITY_MISSING': return 'AVAILABILITY:' + payload.employeeId;
    case 'ACKNOWLEDGEMENT_MISSING': return 'ACKNOWLEDGEMENT:' + payload.employeeId;
    case 'DEADLINE': return 'SETUP:DEADLINE';
    case 'COVERAGE_RULES': return 'SETUP:COVERAGE_RULES';
    case 'ATTENDANCE': return 'ATTENDANCE:' + payload.entryId;
    case 'TIME_CORRECTION': return 'TIME_CORRECTION:' + payload.id;
    case 'TIMECARD': return `TIMECARD:${payload.employeeId}:${payload.startDate}:${payload.endDate}`;
  }
}

/** Validates only allowlisted factual fields needed by this projection. Private
 * correction context, attendance messages/evidence and arbitrary hrefs are not
 * copied. Canonical readers retain full domain validation/mutation ownership. */
function projectFact(raw: unknown, source: Extract<IntelligenceSource, { state: 'ready' }>, context: ActionIntelligenceInput['context'],
  allowedLocations: Set<string>): { item: IntelligenceItem | null; incomplete: boolean } {
  if (!record(raw) || !enumValue(raw.kind, Object.keys(FIELD_REQUIREMENTS) as ActionFact['kind'][]) || sourceOf(raw.kind) !== source.source || !record(raw.payload)) throw Error('Invalid fact');
  const meta = metadataFrom(raw.meta), kind = raw.kind, p = raw.payload;
  if (meta.workspaceId !== context.workspaceId || meta.version !== meta.currentVersion) throw Error('Stale fact');
  if (!meta.footprintComplete) return { item: null, incomplete: true };
  const known = new Map(context.locations.map(location => [location.id, location]));
  if (meta.locationIds.some(id => !known.has(id) || known.get(id)?.workspaceId !== context.workspaceId)) throw Error('Invalid footprint');
  // Whole-row suppression precedes payload projection: no outside-M names,
  // links, partial card totals, row counts or reason counts leave this boundary.
  if (meta.locationIds.some(id => !allowedLocations.has(id) || (source.source === 'scheduling' && !known.get(id)?.active))) return { item: null, incomplete: false };
  if (context.role === 'MANAGER' && !meta.locationIds.length) return { item: null, incomplete: true };
  if (!meta.readAllowed || !meta.destinationAllowed || !FIELD_REQUIREMENTS[kind].every(field => meta.permittedFields.includes(field))) return { item: null, incomplete: true };
  if (canonicalId(kind, p) !== meta.id || (meta.sourceTimestamp !== null && Temporal.Instant.compare(meta.sourceTimestamp, source.observedAt) > 0)) throw Error('Inconsistent source reference');
  const employee = () => {
    if (!text(p.employeeId) || !text(p.employeeName) || !meta.subjectIds.includes(p.employeeId)) throw Error('Invalid subject');
    return { employeeId: p.employeeId, employeeName: p.employeeName };
  };
  const location = () => { if (!text(p.locationId) || !meta.locationIds.includes(p.locationId)) throw Error('Incomplete location footprint'); };
  const scheduling = { weekStart: context.weekStart, availabilityDeadlineSet: true, coverageRulesConfigured: true };
  let item: ManagerActionItem | null = null, code: string = '', label = '', sourceTimestamp = optionalInstant(meta.sourceTimestamp);
  let startAt = optionalInstant(meta.startAt), category: IntelligenceItem['category'] = 'scheduling';
  switch (kind) {
    case 'COVERAGE_GAP': {
      location();
      if (!text(p.key) || !text(p.locationName) || !(p.gap === null || integer(p.gap)) || !(p.requiresLead === null || typeof p.requiresLead === 'boolean')) throw Error('Invalid coverage');
      const day = date(p.date), start = time(p.startTime);
      // Canonical coverage permits exactly 24:00 as an end boundary.
      const end = p.endTime === '24:00' ? p.endTime : time(p.endTime);
      if (!isDateInWeek(day, context.weekStart)) throw Error('Incorrect coverage week');
      const actualStart = Temporal.PlainDateTime.from(`${day}T${start}`).toZonedDateTime(context.timeZone, { disambiguation: 'reject' }).toInstant().toString();
      if (startAt !== null && Temporal.Instant.compare(startAt, actualStart)) throw Error('Inconsistent start');
      startAt = actualStart;
      const positions: NonNullable<ManagerCoverageGapInput['positionCoverage']> = [];
      if (p.positionCoverage !== undefined) {
        if (!Array.isArray(p.positionCoverage) || p.positionCoverage.length > 1000) throw Error('Invalid position coverage');
        for (const position of p.positionCoverage) {
          if (!record(position) || !text(position.positionId) || !text(position.positionName) || !integer(position.missing)) throw Error('Invalid position');
          positions.push({ positionId: position.positionId, positionName: position.positionName, missing: position.missing });
        }
        positions.sort((a, b) => compareText(a.positionId, b.positionId));
        if (new Set(positions.map(position => position.positionId)).size !== positions.length) throw Error('Duplicate positions');
      }
      if (p.gap === 0 && p.requiresLead === false && !positions.some(position => position.missing > 0)) return { item: null, incomplete: false };
      const setup = p.gap === null || p.requiresLead === null;
      if (setup && !meta.permittedFields.includes('configuration')) return { item: null, incomplete: true };
      item = buildManagerActionItems({ ...scheduling, coverageGaps: [{ key: p.key, locationId: p.locationId as string, locationName: p.locationName,
        date: day, startTime: start, endTime: end, gap: p.gap as number | null, requiresLead: p.requiresLead as boolean | null, positionCoverage: positions }] })[0];
      code = setup ? 'COVERAGE_SETUP_REQUIRED' : positions.some(position => position.missing > 0) ? 'POSITION_COVERAGE_MISSING' : p.gap === 0 ? 'LEAD_COVERAGE_MISSING' : 'STAFF_COVERAGE_MISSING';
      label = setup ? 'Configure staffing rules' : 'Open coverage review'; break;
    }
    case 'HOURS': {
      const subject = employee();
      if (!enumValue(p.kind, ['UNDER', 'OVER', 'TARGET_MISSING'])) throw Error('Invalid hours issue');
      if (p.kind !== 'TARGET_MISSING' && (typeof p.scheduledHours !== 'number' || !Number.isFinite(p.scheduledHours) || p.scheduledHours < 0 ||
        typeof p.targetHours !== 'number' || !Number.isFinite(p.targetHours) || p.targetHours < 0 ||
        (p.kind === 'UNDER' ? p.scheduledHours >= p.targetHours : p.scheduledHours <= p.targetHours))) throw Error('Missing hours facts');
      item = buildManagerActionItems({ ...scheduling, hourIssues: [{ ...subject, kind: p.kind, scheduledHours: p.scheduledHours as number | undefined, targetHours: p.targetHours as number | undefined }] })[0];
      code = 'HOURS_' + p.kind; label = p.kind === 'TARGET_MISSING' ? 'Configure weekly hour target' : 'Open schedule review'; break;
    }
    case 'REQUEST': {
      const subject = employee();
      if (!text(p.id) || !enumValue(p.kind, ['TIME_OFF', 'EXCHANGE', 'CALLOUT'])) throw Error('Invalid request');
      const createdAt = instant(p.createdAt);
      if (sourceTimestamp !== null && Temporal.Instant.compare(sourceTimestamp, createdAt)) throw Error('Inconsistent timestamp');
      sourceTimestamp = createdAt;
      item = buildManagerActionItems({ ...scheduling, pendingRequests: [{ id: p.id, kind: p.kind, employeeName: subject.employeeName, createdAt }] })[0];
      category = 'requests'; code = p.kind + '_PENDING'; label = 'Open request review'; break;
    }
    case 'AVAILABILITY_MISSING': case 'ACKNOWLEDGEMENT_MISSING': {
      const subject = employee();
      item = buildManagerActionItems({ ...scheduling, ...(kind === 'AVAILABILITY_MISSING' ? { missingAvailability: [subject] } : { unacknowledgedEmployees: [subject] }) })[0];
      code = kind; label = kind === 'AVAILABILITY_MISSING' ? 'Open availability review' : 'Open published schedule'; break;
    }
    case 'DEADLINE': case 'COVERAGE_RULES': {
      if (typeof p.configured !== 'boolean') throw Error('Invalid configuration fact');
      if (p.configured) return { item: null, incomplete: false };
      item = buildManagerActionItems({ ...scheduling, ...(kind === 'DEADLINE' ? { availabilityDeadlineSet: false } : { coverageRulesConfigured: false }) })[0];
      code = kind + '_MISSING'; label = kind === 'DEADLINE' ? 'Set availability deadline' : 'Configure coverage rules'; break;
    }
    case 'ATTENDANCE': {
      const subject = employee(); location();
      if (!text(p.entryId) || !integer(p.sourceVersion) || String(p.sourceVersion) !== meta.version || !Array.isArray(p.observations) || p.observations.length > 1000 ||
        !p.observations.every(observation => record(observation) && text(observation.id) && enumValue(observation.kind, OBSERVATIONS)) ||
        new Set(p.observations.map(observation => observation.id)).size !== p.observations.length) throw Error('Invalid attendance');
      if (!p.observations.length) return { item: null, incomplete: false };
      item = { id: 'ATTENDANCE:' + p.entryId, type: 'HOURS_REVIEW', priority: 'REVIEW', title: 'Recorded attendance needs review',
        detail: `${subject.employeeName} · ${p.observations.length} recorded observations.`, href: '/app?view=attendance#attendance-' + encodeURIComponent(p.entryId) };
      code = 'RECORDED_ATTENDANCE_OBSERVATIONS'; label = 'Open attendance review'; category = 'timekeeping'; break;
    }
    case 'TIME_CORRECTION': {
      const subject = employee(); location();
      if (!text(p.id) || !enumValue(p.kind, ['ENTRY_BOUNDARY', 'BREAK_BOUNDARY', 'MISSING_ENTRY']) || !enumValue(p.status, ['PENDING', 'APPROVED', 'REJECTED']) ||
        !integer(p.revision, 1) || String(p.revision) !== meta.version || typeof p.isSelf !== 'boolean' || p.isSelf !== (subject.employeeId === context.actorId)) throw Error('Invalid correction');
      const createdAt = instant(p.createdAt);
      if (sourceTimestamp !== null && Temporal.Instant.compare(sourceTimestamp, createdAt)) throw Error('Inconsistent timestamp');
      sourceTimestamp = createdAt;
      if (Temporal.Instant.compare(createdAt, source.observedAt) > 0) throw Error('Future correction creation');
      if (p.status !== 'PENDING') return { item: null, incomplete: false };
      item = { id: 'TIME_CORRECTION:' + p.id, type: 'HOURS_REVIEW', priority: 'REVIEW',
        title: p.isSelf ? 'Your correction needs another reviewer' : 'Time correction waiting for review',
        detail: `${subject.employeeName} · ${p.kind === 'MISSING_ENTRY' ? 'Missed punch' : p.kind === 'BREAK_BOUNDARY' ? 'Break times' : 'Clock times'}`,
        href: '/app?view=attendance#correction-' + encodeURIComponent(p.id) };
      code = 'CORRECTION_' + p.kind; label = p.isSelf ? 'View your correction' : 'Open correction review'; category = 'timekeeping'; break;
    }
    case 'TIMECARD': {
      const subject = employee(), start = date(p.startDate), end = date(p.endDate);
      const days = Temporal.PlainDate.from(start).until(Temporal.PlainDate.from(end)).days;
      // The current Action Center reader requests exactly the selected week;
      // other period cards belong to their canonical period view.
      if (days !== 6 || start !== context.weekStart || !enumValue(p.state, ['DRAFT', 'APPROVED', 'FINALIZED', 'REOPENED', 'NEEDS_REVIEW']) ||
        !integer(p.revision) || !text(p.sourceHash) || `${p.revision}:${p.sourceHash}` !== meta.version || !Array.isArray(p.entries) || p.entries.length > 10000 ||
        !Array.isArray(p.history) || p.history.length > 1000 || !Array.isArray(p.issues) || !p.issues.every(issue => enumValue(issue, ISSUES))) throw Error('Invalid timecard');
      const entriesInScope = (entries: unknown) => Array.isArray(entries) && entries.length <= 10000 && entries.every(entry => record(entry) && text(entry.locationId) && meta.locationIds.includes(entry.locationId));
      if (!entriesInScope(p.entries)) throw Error('Incomplete card footprint');
      let latestHistory: string | null = null;
      for (const history of p.history) {
        if (!record(history) || !record(history.snapshot) || !entriesInScope(history.snapshot.entries)) throw Error('Incomplete history footprint');
        const timestamp = instant(history.occurredAt);
        if (Temporal.Instant.compare(timestamp, source.observedAt) > 0) throw Error('Future history');
        if (latestHistory === null || Temporal.Instant.compare(timestamp, latestHistory) > 0) latestHistory = timestamp;
      }
      if (latestHistory !== null) {
        if (sourceTimestamp !== null && Temporal.Instant.compare(sourceTimestamp, latestHistory)) throw Error('Inconsistent timestamp');
        sourceTimestamp = latestHistory;
      }
      if (p.state === 'FINALIZED' || (!p.entries.length && !p.history.length)) return { item: null, incomplete: false };
      const self = subject.employeeId === context.actorId;
      item = { id: `TIMECARD:${subject.employeeId}:${start}:${end}`, type: 'HOURS_REVIEW', priority: 'REVIEW',
        title: self ? 'Your timecard needs another reviewer' : p.state === 'APPROVED' ? 'Approved timecard awaits finalization' : 'Period timecard needs review',
        detail: `${subject.employeeName} · ${formatCalendarRange(start,end)}${p.issues.length ? ' · Fix recorded-time issues before finalizing.' : '.'}`,
        href: `/app/timecards?start=${start}&end=${end}#timecard-${encodeURIComponent(subject.employeeId)}` };
      code = self ? 'TIMECARD_SECOND_REVIEWER_REQUIRED' : p.state === 'APPROVED' ? 'TIMECARD_AWAITS_FINALIZATION' : p.issues.length ? 'TIMECARD_RECORDED_EXCEPTIONS' : 'TIMECARD_PERIOD_REVIEW';
      label = self ? 'View your timecard' : 'Open timecard review'; category = 'timekeeping'; break;
    }
  }
  if (!item || item.id !== meta.id || item.title.length > 500 || item.detail.length > 3000 ||
    (sourceTimestamp !== null && Temporal.Instant.compare(sourceTimestamp, source.observedAt) > 0)) throw Error('Inconsistent item');
  if (meta.state !== 'ACTIONABLE') return { item: null, incomplete: false };
  return { incomplete: false, item: { id: item.id, type: kind === 'ATTENDANCE' || kind === 'TIME_CORRECTION' || kind === 'TIMECARD' ? kind : item.type,
    category, priority: item.priority, title: item.title, reason: { code, text: item.detail }, source: source.source,
    sourceVersion: source.version, rowVersion: meta.version, observedAt: instant(source.observedAt),
    relevantAt: optionalInstant(meta.deadlineAt) ?? startAt, sourceTimestamp,
    nextAction: { label, href: item.href } } };
}

function build(value: unknown): ActionIntelligenceResult {
  if (!record(value) || !Array.isArray(value.sources) || value.sources.length !== SOURCES.length) return unavailable('INVALID_INPUT');
  const context = contextFrom(value.context), now = instant(context.now);
  if (!context.online) return unavailable('OFFLINE');
  if (!context.workspaceActive || !context.workforceActive || context.portalState !== 'ENABLED' || !context.membershipCurrent ||
    !context.sessionCurrent || !context.grantsCurrent || !context.actionCenterReadAllowed || !['OWNER', 'MANAGER'].includes(context.role) ||
    Temporal.Instant.compare(context.authorityExpiresAt, now) <= 0 || (context.role === 'MANAGER' && context.administrativeScope === null)) return unavailable('ACCESS_DENIED');
  const known = new Map(context.locations.map(location => [location.id, location]));
  if (context.locations.some(location => location.workspaceId !== context.workspaceId)) return unavailable('INVALID_INPUT');
  const scope = context.administrativeScope;
  if (scope?.kind === 'LOCATIONS' && scope.locationIds.some(id => !known.has(id))) return unavailable('INVALID_INPUT');
  const administrative = context.role === 'OWNER' || scope?.kind === 'ALL_TENANT' ? new Set(known.keys()) : new Set(scope?.kind === 'LOCATIONS' ? scope.locationIds : []);
  if (context.selectedLocationIds.some(id => !known.has(id) || !administrative.has(id))) return unavailable('ACCESS_DENIED');
  const allowed = new Set(context.selectedLocationIds), sources = new Map<SourceKey, Record<string, unknown>>();
  for (const source of value.sources) {
    if (!record(source) || !enumValue(source.source, SOURCES) || sources.has(source.source)) return unavailable('INVALID_INPUT');
    sources.set(source.source, source);
  }
  const sections: IntelligenceSection[] = [], items = new Map<string, IntelligenceItem>(), conflicts = new Set<string>();
  let validUntil = instant(context.authorityExpiresAt), observed = 0;
  const fail = (source: SourceKey, reason: SourceFailure): IntelligenceSection => ({ source, label: LABELS[source], state: 'unavailable', reason,
    observedCount: null, retry: { kind: 'RETRY_SOURCE', source } });
  for (const key of SOURCES) {
    const raw = sources.get(key)!;
    if (!record(raw.binding) || !BINDINGS.every(binding => raw.binding && record(raw.binding) && raw.binding[binding] === context[binding])) {
      sections.push(fail(key, 'STALE_SOURCE')); continue;
    }
    if (raw.state === 'loading') {
      sections.push({ source: key, label: LABELS[key], state: 'loading', observedCount: null, retry: { kind: 'RETRY_SOURCE', source: key } }); continue;
    }
    if (raw.state === 'unavailable') { sections.push(fail(key, enumValue(raw.reason, FAILURES) ? raw.reason : 'INVALID_SOURCE')); continue; }
    if (raw.state !== 'ready' || !text(raw.version) || !enumValue(raw.coverage, ['complete', 'limited', 'capped']) || !Array.isArray(raw.rows)) {
      sections.push(fail(key, 'INVALID_SOURCE')); continue;
    }
    if (raw.rows.length > 1000) { sections.push(fail(key, 'SOURCE_LIMIT')); continue; }
    let expires: string;
    try {
      const at = instant(raw.observedAt); expires = instant(raw.expiresAt);
      if (raw.version !== context.expectedSourceVersions[key] || Temporal.Instant.compare(at, now) > 0 || Temporal.Instant.compare(expires, now) <= 0 ||
        Temporal.Instant.compare(expires, at) <= 0 || Temporal.Instant.from(expires).epochNanoseconds - Temporal.Instant.from(at).epochNanoseconds > BigInt(45_000_000_000)) throw Error('Stale source');
    } catch { sections.push(fail(key, 'STALE_SOURCE')); continue; }
    observed++;
    if (Temporal.Instant.compare(expires, validUntil) < 0) validUntil = expires;
    const source = raw as unknown as Extract<IntelligenceSource, { state: 'ready' }>;
    let incomplete = source.coverage !== 'complete';
    for (const row of source.rows) {
      try {
        const projection = projectFact(row, source, context, allowed); incomplete ||= projection.incomplete;
        if (!projection.item) continue;
        const item = projection.item, previous = items.get(item.id);
        if (conflicts.has(item.id)) { incomplete = true; continue; }
        if (previous && JSON.stringify(previous) !== JSON.stringify(item)) { items.delete(item.id); conflicts.add(item.id); incomplete = true; continue; }
        items.set(item.id, item);
      } catch { incomplete = true; }
    }
    sections.push({ source: key, label: LABELS[key], state: incomplete ? 'limited' : 'complete', observedCount: 0,
      ...(incomplete ? { reason: 'INCOMPLETE_SOURCE' as const, retry: { kind: 'RETRY_SOURCE' as const, source: key } } : {}) });
  }
  if (!observed) return { state: sections.every(section => section.state === 'loading') ? 'loading' : 'unavailable', allClear: false, sections };
  if (items.size > 1000) return unavailable('SOURCE_LIMIT');
  const ranks = { URGENT: 0, REVIEW: 1, MISSING_INPUT: 2 };
  const ordered = [...items.values()].sort((a, b) => ranks[a.priority] - ranks[b.priority] || compareTime(a.relevantAt, b.relevantAt) ||
    compareTime(a.sourceTimestamp, b.sourceTimestamp) || compareText(a.id, b.id));
  const counts = { total: ordered.length, scheduling: 0, requests: 0, timekeeping: 0 };
  for (const item of ordered) { counts[item.category]++; const section = sections.find(section => section.source === item.source)!; section.observedCount!++; }
  const complete = sections.every(section => section.state === 'complete');
  return { state: complete ? 'ready' : 'partial', allClear: complete && !ordered.length, allClearScope: 'AUTHORIZED_CURRENT_SCOPE',
    viewId: context.viewId, weekStart: context.weekStart, locationIds: [...allowed].sort(compareText), validUntil, items: ordered, counts, sections };
}

/** Fail closed on malformed observations; public diagnostics never include the
 * rejected payload/ID, private source errors, session or proof material. */
export function buildActionIntelligence(value: unknown): ActionIntelligenceResult {
  try { return build(value); } catch { return unavailable('INVALID_INPUT'); }
}
