import { types as nodeTypes } from 'node:util';
import { Temporal } from '@js-temporal/polyfill';
import { projectTimecard } from '../timecards/project';
import { parseTimecardsResponse } from '../timecards/read-model';
import { projectAttendance } from '../attendance/project';
import { validateAttendanceSource } from '../attendance/validation';
import { parseManagerTimeCorrections } from '../time-corrections/read-model';
import type { Position } from '../domain';
import type { ActionFact, SourceKey } from './intelligence';
import type { BuildManagerActionItemsInput } from '../assistance/manager-actions';
import type { ScheduleShiftRow } from '../data/schedules';
import type { TimeOffListItem } from '../data/requests';
import type { ExchangeRecord } from '../data/exchanges';
import type { CalloutRecord } from '../data/callouts';
import type { listLocationStaffingSettings, listCoverageWindows, listEmployeeHourTargets } from '../data/schedule-health';
import type { AttendanceDisplayReview } from '../attendance/read-model';
import type { AttendanceSource, ReadyProjection } from '../attendance/types';
import type { ManagerTimeCorrections } from '../time-corrections/read-model';
import type { TimecardProjection } from '../timecards/read-model';

/** UNUSED internal capture adapter, not a protected reader or proof issuer.
 * Canonical reader captures are observations. No output grants access, marks a
 * source current, supplies ActionMetadata or may be sent directly to a client.
 * The F10/F6 adapter must independently verify current full-source/subject/card
 * scope, action-center and destination reads, fields, grants and final release.
 * In particular an eligible location, source hash, role or legacy proof is not
 * any of those verifications. No aggregate version, TTL or policy is invented. */
export type SchedulingActionCapture = {
  workspaceId: string; actorEmployeeId: string; weekStart: string; actionInput: BuildManagerActionItemsInput;
  healthShifts: ScheduleShiftRow[]; positions: Position[];
  employeeTargets: Awaited<ReturnType<typeof listEmployeeHourTargets>>;
  staffingSettings: Awaited<ReturnType<typeof listLocationStaffingSettings>>;
  coverageWindows: Awaited<ReturnType<typeof listCoverageWindows>>;
  pendingTimeOff: TimeOffListItem[]; pendingExchanges: ExchangeRecord[];
  pendingCallouts: CalloutRecord[]; availabilityDeadline: string | null;
};
export type AttendanceActionCapture = {
  actorEmployeeId: string; source: AttendanceSource; projection: ReadyProjection;
  labels: Extract<AttendanceDisplayReview, { state: 'ready' }>['labels'];
  sessionExpiresAt: string; validForMs: number;
};
type CorrectionReference = { id: string; workspaceId: string; employeeId: string;
  locationId: string; snapshotLocationId: string | null; revision: number; occurredAt: string };
type AdjustmentReference = Omit<CorrectionReference, 'revision'> & {
  requestId: string; sourceRevision: number; supersedesId: string | null };
export type CorrectionNativeCapture = {
  id: string; workspaceId: string; employeeId: string; locationId: string;
  kind:'ENTRY_BOUNDARY'|'BREAK_BOUNDARY'|'MISSING_ENTRY'; status:'PENDING'|'APPROVED'|'REJECTED';
  timeEntryId: string | null; breakEntryId: string | null; sourceRevision: number; baseAdjustmentId: string | null;
  revision: number; createdAt: string; requests: CorrectionReference[];
  adjustments: AdjustmentReference[];
  recordedTarget: null | { id: string; employeeId: string; locationId: string; version: number };
  breakTarget: null | { id: string; timeEntryId: string; version: number };
  locations: { id: string; workspaceId: string }[];
};
export type CorrectionActionCapture = {
  workspaceId: string; actorEmployeeId: string;
  view: Extract<ManagerTimeCorrections, { state: 'ready' }>;
  nativeRows: CorrectionNativeCapture[]; validForMs: number;
};
export type TimecardActionCapture = {
  workspaceId: string; actorEmployeeId: string; projection: TimecardProjection;
  /** Separate current_source, including for FINALIZED displayed snapshots. */
  currentSources: unknown; validForMs: number;
};
type WithoutMetadata<T> = T extends unknown ? Omit<T, 'meta'> : never;
export type CanonicalActionPayload = WithoutMetadata<ActionFact>;
export type CaptureHold = 'PROTECTED_F10_READ_REQUIRED' | 'CANONICAL_F6_RELEASE_REQUIRED'
  | 'CURRENT_SOURCE_BINDING_REQUIRED' | 'WHOLE_SUBJECT_BINDING_REQUIRED'
  | 'AGGREGATE_SOURCE_VERSION_REQUIRED' | 'SOURCE_LIFETIME_REQUIRED'
  | 'NATIVE_ROW_VERSION_REQUIRED' | 'REQUEST_HISTORY_FOOTPRINT_REQUIRED'
;
export type PreparedActionRow = CanonicalActionPayload & {
  sourceId: string; workspaceId: string;
  /** Native row revision only; null means the producer does not expose it. */
  nativeRowVersion: string | null;
  /** Captured causal/domain IDs, not permitted IDs or authenticated F6 scope.
   * Scheduling keeps a conservative complete input superset; the protected
   * canonical source must bind exact causality before using ActionMetadata. */
  capturedLocationIds: string[]; capturedSubjectIds: string[];
  sourceTimestamp: string | null; deadlineAt: string | null;
  requiredFieldCodes: string[];
  /** Read navigation only, never a review/approval/mutation grant. */
  destinationRead: 'schedule.draft.read' | 'request.review' | 'configuration.scheduling.manage'
    | 'attendance.read' | 'timecard.read';
  holds: CaptureHold[];
};
export type PreparedCanonicalSource = {
  state: 'CAPTURED_UNBOUND'; source: SourceKey; workspaceId: string;
  observedAt: string | null; remainingDisplayMs: number | null;
  /** Completeness of the captured canonical domain, NOT authorized F1 coverage. */
  canonicalCoverage: 'complete' | 'limited' | 'not_reported'; rows: PreparedActionRow[];
  /** Full native causal data stay internal, separate from allowlisted payloads. */
  captured: unknown; holds: CaptureHold[];
};
const BASE_HOLDS: CaptureHold[] = ['PROTECTED_F10_READ_REQUIRED', 'CANONICAL_F6_RELEASE_REQUIRED',
  'CURRENT_SOURCE_BINDING_REQUIRED', 'AGGREGATE_SOURCE_VERSION_REQUIRED', 'SOURCE_LIFETIME_REQUIRED'];
const own = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const id = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && !/[\u0000-\u001f\u007f]/.test(v);
const integer = (v: unknown, minimum = 0): v is number => Number.isSafeInteger(v) && Number(v) >= minimum;
const instant = (v: unknown): v is string => {
  if (typeof v !== 'string') return false;
  try { Temporal.Instant.from(v); return true; } catch { return false; }
};
const unique = <T extends string>(values: readonly T[]): T[] => [...new Set(values)];

/** Trap-free inert capture copy. Dense arrays, ordinary own enumerable data
 * properties only; no prototype getters, iterator callbacks, Proxy traps or
 * property spread over caller input. Undefined is retained for optional fields
 * supplied by existing typed canonical producers, never treated as authority. */
export function copyCanonicalCapture(value: unknown): unknown {
  const seen = new WeakSet<object>();
  function copy(v: unknown): unknown {
    if (v === null || v === undefined || typeof v === 'string' || typeof v === 'boolean') return v;
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (!v || typeof v !== 'object' || nodeTypes.isProxy(v) || seen.has(v)) throw Error('Invalid internal capture');
    const array = Array.isArray(v), proto = Object.getPrototypeOf(v);
    if (array ? proto !== Array.prototype : proto !== Object.prototype && proto !== null) throw Error('Invalid internal capture');
    seen.add(v);
    const keys = Reflect.ownKeys(v);
    if (keys.some(k => typeof k !== 'string')) throw Error('Invalid internal capture');
    if (array) {
      const length = Object.getOwnPropertyDescriptor(v, 'length');
      if (!length || !Object.hasOwn(length, 'value') || !Number.isSafeInteger(length.value) || length.value < 0 ||
        keys.length !== length.value + 1) throw Error('Invalid internal capture');
      const result: unknown[] = [];
      for (let i = 0; i < length.value; i++) {
        const d = Object.getOwnPropertyDescriptor(v, String(i));
        if (!d || !Object.hasOwn(d, 'value') || !d.enumerable) throw Error('Invalid internal capture');
        result.push(copy(d.value));
      }
      seen.delete(v); return Object.freeze(result);
    }
    const result: Record<string, unknown> = Object.create(null);
    for (const key of keys) {
      const d = Object.getOwnPropertyDescriptor(v, key);
      if (!d || !Object.hasOwn(d, 'value') || !d.enumerable) throw Error('Invalid internal capture');
      Object.defineProperty(result, key, { value: copy(d.value), enumerable: true });
    }
    seen.delete(v); return Object.freeze(result);
  }
  return copy(value);
}

function record(v: unknown): Record<string, unknown> {
  if (!own(v)) throw Error('Invalid internal capture'); return v;
}
function rows(v: unknown): Record<string, unknown>[] {
  if (!Array.isArray(v) || v.some(x => !own(x))) throw Error('Invalid internal capture');
  return v as Record<string, unknown>[];
}
function keys(v: Record<string, unknown>, expected: string[]) {
  if (Object.keys(v).length !== expected.length || expected.some(k => !Object.hasOwn(v, k))) throw Error('Invalid internal capture');
}

/** Join exact native request identity/version to the existing public parser's
 * validated request, before it irreversibly drops employee_id. No names/self
 * flags are used as identity. Complete relevant history references are retained
 * despite the public context showing only the latest five decisions. */
export function parseCorrectionActionCapture(value: unknown,
  view: Extract<ManagerTimeCorrections, { state: 'ready' }>, workspaceId: string,
  actorEmployeeId: string, validForMs: number): CorrectionActionCapture {
  const raw = rows(copyCanonicalCapture(value));
  const publicView = parseManagerTimeCorrections(copyCanonicalCapture(view));
  if (publicView.state !== 'ready' || !id(workspaceId) || !id(actorEmployeeId) ||
    !integer(validForMs, 1) || raw.length !== publicView.requests.length) throw Error('Invalid internal capture');
  const requests = new Map(publicView.requests.map(r => [r.id, r]));
  if (requests.size !== publicView.requests.length || new Set(raw.map(r => r.id)).size !== raw.length) throw Error('Invalid internal capture');
  for (const r of raw) {
    keys(r, ['id','workspaceId','employeeId','kind','status','locationId','timeEntryId','breakEntryId','sourceRevision','baseAdjustmentId','revision','createdAt','requests','adjustments','recordedTarget','breakTarget','locations']);
    const p = requests.get(r.id as string);
    if (!p || r.workspaceId !== workspaceId || !id(r.employeeId) || r.locationId !== p.locationId ||
      r.kind !== p.kind || r.status !== p.status || r.revision !== p.revision || r.createdAt !== p.createdAt || !instant(r.createdAt) ||
      p.isSelf !== (r.employeeId === actorEmployeeId) || !integer(r.sourceRevision) ||
      !(r.baseAdjustmentId === null || id(r.baseAdjustmentId))) throw Error('Invalid internal capture');
    const locations = rows(r.locations);
    if (!locations.length || new Set(locations.map(l => l.id)).size !== locations.length ||
      locations.some(l => !id(l.id) || l.workspaceId !== workspaceId)) throw Error('Invalid internal capture');
    const capturedLocations = new Set(locations.map(l => l.id));
    const scoped = (h: Record<string, unknown>) => h.workspaceId === workspaceId && h.employeeId === r.employeeId &&
      id(h.id) && id(h.locationId) && capturedLocations.has(h.locationId) &&
      (h.snapshotLocationId === null || id(h.snapshotLocationId) && capturedLocations.has(h.snapshotLocationId)) && instant(h.occurredAt);
    const history = rows(r.requests), adjustments = rows(r.adjustments);
    if (!history.some(h => h.id === r.id && h.revision === r.revision) ||
      history.some(h => !scoped(h) || !integer(h.revision, 1)) ||
      adjustments.some(h => !scoped(h) || !id(h.requestId) || !integer(h.sourceRevision) || !(h.supersedesId === null || id(h.supersedesId)))) throw Error('Invalid internal capture');
    if (p.kind === 'MISSING_ENTRY') {
      if (r.recordedTarget !== null || r.breakTarget !== null || r.timeEntryId !== null || r.breakEntryId !== null) throw Error('Invalid internal capture');
    } else {
      const target = record(r.recordedTarget);
      if (!id(target.id) || target.id !== r.timeEntryId || target.employeeId !== r.employeeId || !capturedLocations.has(target.locationId) || !integer(target.version, 1)) throw Error('Invalid internal capture');
      if (p.kind === 'BREAK_BOUNDARY') {
        const b = record(r.breakTarget);
        if (!id(b.id) || b.id !== r.breakEntryId || b.timeEntryId !== target.id || !integer(b.version, 1)) throw Error('Invalid internal capture');
      } else if (r.breakTarget !== null || r.breakEntryId !== null) throw Error('Invalid internal capture');
    }
  }
  return copyCanonicalCapture({ workspaceId, actorEmployeeId, view: publicView, nativeRows: raw, validForMs }) as CorrectionActionCapture;
}

function equalData(a: unknown, b: unknown): boolean {
  const serialize = (v: unknown): string => Array.isArray(v) ? '['+v.map(serialize).join(',')+']' :
    own(v) ? '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+serialize(v[k])).join(',')+'}' : JSON.stringify(v) ?? 'undefined';
  return serialize(copyCanonicalCapture(a)) === serialize(copyCanonicalCapture(b));
}

function prepared(source: SourceKey, workspaceId: string, observedAt: string | null,
  remainingDisplayMs: number | null, canonicalCoverage: PreparedCanonicalSource['canonicalCoverage'], captured: unknown,
  actionRows: PreparedActionRow[], extra: CaptureHold[] = []): PreparedCanonicalSource {
  if (!id(workspaceId) || observedAt !== null && !instant(observedAt) ||
    remainingDisplayMs !== null && !integer(remainingDisplayMs, 1)) throw Error('Invalid internal capture');
  // A data copy is immutable, not a privately issued authority object.
  return copyCanonicalCapture({ state: 'CAPTURED_UNBOUND', source, workspaceId, observedAt,
    remainingDisplayMs, canonicalCoverage, captured, rows: actionRows, holds: unique([...BASE_HOLDS, ...extra]) }) as PreparedCanonicalSource;
}
function action(payload: CanonicalActionPayload, workspaceId: string, sourceId: string,
  nativeRowVersion: string | null, locationIds: string[], subjectIds: string[], fields: string[],
  destinationRead: PreparedActionRow['destinationRead'], sourceTimestamp: string | null = null,
  extra: CaptureHold[] = [], deadlineAt: string | null = null): PreparedActionRow {
  if (!id(sourceId) || locationIds.some(v => !id(v)) || subjectIds.some(v => !id(v)) ||
    sourceTimestamp !== null && !instant(sourceTimestamp) || deadlineAt !== null && !instant(deadlineAt)) throw Error('Invalid internal capture');
  return { ...payload, sourceId, workspaceId, nativeRowVersion,
    capturedLocationIds: unique(locationIds), capturedSubjectIds: unique(subjectIds),
    sourceTimestamp, deadlineAt, requiredFieldCodes: fields, destinationRead,
    holds: unique([...BASE_HOLDS, ...(nativeRowVersion === null ? ['NATIVE_ROW_VERSION_REQUIRED' as const] : []), ...extra]) };
}

export function prepareSchedulingActionRows(input: SchedulingActionCapture): PreparedCanonicalSource {
  const s = copyCanonicalCapture(input) as SchedulingActionCapture;
  if (s.actionInput.weekStart !== s.weekStart) throw Error('Invalid internal capture');
  const result: PreparedActionRow[] = [];
  // Entire canonical health input, not the display row's primary location.
  const healthLocations = unique([...s.healthShifts.map(x => x.locationId),
    ...s.staffingSettings.map(x => x.locationId), ...s.coverageWindows.map(x => x.locationId),
    ...s.employeeTargets.flatMap(x => [...x.eligibleLocationIds])]);
  const healthSubjects = unique(s.healthShifts.map(x => x.employeeId));
  for (const p of s.actionInput.coverageGaps ?? []) {
    const setup = p.gap === null || p.requiresLead === null;
    result.push(action({ kind:'COVERAGE_GAP',payload:{key:p.key,
    locationId:p.locationId,locationName:p.locationName,date:p.date,startTime:p.startTime,endTime:p.endTime,gap:p.gap,
    ...(p.requiresLead === undefined ? {} : {requiresLead:p.requiresLead}),
    ...(p.positionCoverage === undefined ? {} : {positionCoverage:p.positionCoverage.map(x=>({positionId:x.positionId,positionName:x.positionName,missing:x.missing}))})} }, s.workspaceId,
    'COVERAGE:'+p.key, null, healthLocations, healthSubjects, setup ? ['schedule','configuration'] : ['schedule'],
    setup ? 'configuration.scheduling.manage' : 'schedule.draft.read'));
  }
  for (const p of s.actionInput.hourIssues ?? []) {
    const setup = p.kind === 'TARGET_MISSING';
    result.push(action({kind:'HOURS',payload:{employeeId:p.employeeId,
    employeeName:p.employeeName,kind:p.kind,...(p.scheduledHours===undefined?{}:{scheduledHours:p.scheduledHours}),
    ...(p.targetHours===undefined?{}:{targetHours:p.targetHours})}},s.workspaceId,
    'HOURS:'+p.employeeId,null,s.healthShifts.filter(x=>x.employeeId===p.employeeId).map(x=>x.locationId),
    [p.employeeId],setup ? ['schedule','employee.identity','configuration'] : ['schedule','employee.identity'],
    setup ? 'configuration.scheduling.manage' : 'schedule.draft.read'));
  }
  for (const p of s.actionInput.pendingRequests ?? []) {
    const original = p.kind==='TIME_OFF' ? s.pendingTimeOff.find(r=>r.id===p.id) :
      p.kind==='EXCHANGE' ? s.pendingExchanges.find(r=>r.id===p.id) : s.pendingCallouts.find(r=>r.id===p.id);
    if (!original || original.createdAt!==p.createdAt) throw Error('Invalid internal capture');
    const employeeId = 'requestedByEmployeeId' in original ? original.requestedByEmployeeId : original.employeeId;
    const locationIds = 'sourceShift' in original ? [original.sourceShift.locationId,...(original.targetShift?[original.targetShift.locationId]:[])] :
      'locationId' in original ? [original.locationId] : [];
    const subjects = 'sourceShift' in original ? [employeeId,original.sourceShift.employeeId,...(original.targetShift?[original.targetShift.employeeId]:[])] : [employeeId];
    const version = 'requestRevision' in original && integer(original.requestRevision,1) ? String(original.requestRevision) : null;
    result.push(action({kind:'REQUEST',payload:{id:p.id,kind:p.kind,employeeName:p.employeeName,createdAt:p.createdAt,employeeId}},
      s.workspaceId,p.kind+':'+p.id,version,locationIds,subjects,['request','employee.identity'],'request.review',p.createdAt,
      ['REQUEST_HISTORY_FOOTPRINT_REQUIRED']));
  }
  for (const [kind, prefix, values] of [
    ['AVAILABILITY_MISSING','AVAILABILITY',s.actionInput.missingAvailability ?? []],
    ['ACKNOWLEDGEMENT_MISSING','ACKNOWLEDGEMENT',s.actionInput.unacknowledgedEmployees ?? []],
  ] as const) for (const p of values) result.push(action({kind,payload:{employeeId:p.employeeId,employeeName:p.employeeName}},s.workspaceId,prefix+':'+p.employeeId,
    null,healthLocations,[p.employeeId],['schedule','employee.identity'],'schedule.draft.read',null,[],
    kind==='AVAILABILITY_MISSING'?s.availabilityDeadline:null));
  result.push(action({kind:'DEADLINE',payload:{configured:s.actionInput.availabilityDeadlineSet}},s.workspaceId,
    'SETUP:DEADLINE',null,healthLocations,[],['configuration'],'configuration.scheduling.manage'));
  result.push(action({kind:'COVERAGE_RULES',payload:{configured:s.actionInput.coverageRulesConfigured}},s.workspaceId,
    'SETUP:COVERAGE_RULES',null,healthLocations,[],['configuration'],'configuration.scheduling.manage'));
  return prepared('scheduling',s.workspaceId,null,null,'not_reported',s,result,['SOURCE_LIFETIME_REQUIRED']);
}

export function prepareAttendanceActionRows(input: AttendanceActionCapture): PreparedCanonicalSource {
  const s = copyCanonicalCapture(input) as AttendanceActionCapture;
  const nativeSource = validateAttendanceSource(s.source);
  if ('state' in nativeSource) throw Error('Invalid internal capture');
  const canonicalProjection = projectAttendance(nativeSource);
  if (canonicalProjection.state !== 'ready' || !equalData(canonicalProjection,s.projection)) throw Error('Invalid internal capture');
  if (s.source.workspaceId !== s.projection.workspaceId || s.source.observedAt !== s.projection.observedAt ||
    !instant(s.sessionExpiresAt)) throw Error('Invalid internal capture');
  const labels = new Map(s.labels.employees.map(x=>[x.id,x.name]));
  const result = s.projection.groups.map(p => {
    const raw = s.source.entries.find(e=>e.id===p.entryId);
    if (!raw || raw.employeeId!==p.employeeId || raw.locationId!==p.locationId || raw.sourceVersion!==p.sourceVersion || !labels.has(p.employeeId)) throw Error('Invalid internal capture');
    // Retain overlapping support and captured historical publication locations.
    const related = s.source.entries.filter(e=>e.employeeId===p.employeeId);
    const publications = s.source.publications.filter(e=>e.employeeId===p.employeeId);
    return action({kind:'ATTENDANCE',payload:{entryId:p.entryId,employeeId:p.employeeId,employeeName:labels.get(p.employeeId)!,
      locationId:p.locationId,sourceVersion:p.sourceVersion,observations:p.observations.map(o=>({id:o.id,kind:o.kind}))}},
      s.source.workspaceId,'ATTENDANCE:'+p.entryId,String(p.sourceVersion),
      [...related.map(e=>e.locationId),...publications.map(e=>e.locationId)],[p.employeeId],['attendance','employee.identity'],
      'attendance.read',null,['WHOLE_SUBJECT_BINDING_REQUIRED']);
  });
  return prepared('attendance',s.source.workspaceId,s.source.observedAt,s.validForMs,s.projection.coverage.state,s,result,
    ['WHOLE_SUBJECT_BINDING_REQUIRED']);
}

export function prepareCorrectionActionRows(input: CorrectionActionCapture): PreparedCanonicalSource {
  const s = copyCanonicalCapture(input) as CorrectionActionCapture;
  // Revalidate the native/public join even when this pure API is called directly.
  parseCorrectionActionCapture(s.nativeRows,s.view,s.workspaceId,s.actorEmployeeId,s.validForMs);
  const byId = new Map(s.nativeRows.map(r=>[r.id,r]));
  const result = s.view.requests.map(p => {
    const r = byId.get(p.id)!;
    return action({kind:'TIME_CORRECTION',payload:{id:p.id,employeeId:r.employeeId,employeeName:p.employeeName,
      locationId:p.locationId,kind:p.kind,status:p.status,revision:p.revision,createdAt:p.createdAt,
      isSelf:r.employeeId===s.actorEmployeeId}},s.workspaceId,'TIME_CORRECTION:'+p.id,String(r.revision),
      r.locations.map(l=>l.id),[r.employeeId],['attendance','employee.identity'],'attendance.read',p.createdAt,
      ['WHOLE_SUBJECT_BINDING_REQUIRED']);
  });
  return prepared('corrections',s.workspaceId,s.view.observedAt,s.validForMs,'complete',s,result,['WHOLE_SUBJECT_BINDING_REQUIRED']);
}

export function prepareTimecardActionRows(input: TimecardActionCapture): PreparedCanonicalSource {
  const s = copyCanonicalCapture(input) as TimecardActionCapture;
  const canonical = parseTimecardsResponse(s.projection,s.projection.period);
  if (!equalData(canonical,s.projection)) throw Error('Invalid internal capture');
  const current = rows(s.currentSources), cards=canonical.cards;
  if (current.length!==cards.length || new Set(current.map(r=>r.employeeId)).size!==current.length) throw Error('Invalid internal capture');
  const result = cards.map(p => {
    const raw=current.find(r=>r.employeeId===p.card.employeeId);
    if (!raw || typeof raw.sourceHash!=='string' || !/^[a-f0-9]{32}$/.test(raw.sourceHash)) throw Error('Invalid internal capture');
    const nowCard=projectTimecard(raw.source,s.projection.observedAt);
    if (nowCard.employeeId!==p.card.employeeId || nowCard.startDate!==p.card.startDate || nowCard.endDate!==p.card.endDate) throw Error('Invalid internal capture');
    const footprint=record(raw.correctionFootprint), references=rows(footprint.requests), adjustments=rows(footprint.adjustments);
    const referencedIds=footprint.referencedRequestIds;
    if (!Array.isArray(referencedIds) || referencedIds.some(v=>!id(v)) ||
      new Set(referencedIds).size!==referencedIds.length ||
      referencedIds.some(v=>!references.some(r=>r.id===v))) throw Error('Invalid internal capture');
    const sourceRequestIds=unique([...nowCard.corrections.map(r=>r.id),...p.history.flatMap(h=>h.snapshot.corrections.map(r=>r.id))]);
    if (sourceRequestIds.length!==referencedIds.length || sourceRequestIds.some(v=>!referencedIds.includes(v))) throw Error('Invalid internal capture');
    const nativeLocations=rows(footprint.locations);
    if (new Set(nativeLocations.map(l=>l.id)).size!==nativeLocations.length || nativeLocations.some(l=>!id(l.id)||l.workspaceId!==s.workspaceId)) throw Error('Invalid internal capture');
    const locationSet=new Set(nativeLocations.map(l=>l.id));
    if ([...references,...adjustments].some(r=>!id(r.id)||r.workspaceId!==s.workspaceId||r.employeeId!==p.card.employeeId||
      !id(r.locationId)||!locationSet.has(r.locationId)||!(r.snapshotLocationId===null||id(r.snapshotLocationId)&&locationSet.has(r.snapshotLocationId))) ||
      references.some(r=>!integer(r.revision,1)) || adjustments.some(r=>!integer(r.sourceRevision)||!id(r.requestId)||
        !references.some(h=>h.id===r.requestId)||!(r.supersedesId===null||id(r.supersedesId)))) throw Error('Invalid internal capture');
    const latest=p.history.reduce<string|null>((at,h)=>at===null||Temporal.Instant.compare(h.occurredAt,at)>0?h.occurredAt:at,null);
    const history=p.history.map(h=>({occurredAt:h.occurredAt,snapshot:{entries:h.snapshot.entries.map(e=>({locationId:e.locationId}))}}));
    const locations=[...p.source.entries.map(e=>e.locationId),...nowCard.entries.map(e=>e.locationId),
      ...p.history.flatMap(h=>h.snapshot.entries.map(e=>e.locationId)),...nativeLocations.map(l=>l.id as string)];
    return action({kind:'TIMECARD',payload:{employeeId:p.card.employeeId,employeeName:p.card.employeeName,
      startDate:p.card.startDate,endDate:p.card.endDate,state:p.state,revision:p.revision,sourceHash:p.sourceHash,
      entries:p.source.entries.map(e=>({locationId:e.locationId})),history,issues:p.card.issues}},s.workspaceId,
      `TIMECARD:${p.card.employeeId}:${p.card.startDate}:${p.card.endDate}`,`${p.revision}:${p.sourceHash}`,
      locations,[p.card.employeeId],['timecard','employee.identity'],'timecard.read',latest,
      ['WHOLE_SUBJECT_BINDING_REQUIRED']);
  });
  return prepared('timecards',s.workspaceId,s.projection.observedAt,s.validForMs,'complete',s,result,
    ['WHOLE_SUBJECT_BINDING_REQUIRED']);
}

export type CanonicalCaptureInput<T> = { state:'captured'; capture:T }
  | { state:'loading' } | { state:'unavailable'; reason:
    'READ_FAILED'|'ACCESS_DENIED'|'SCHEMA_UNAVAILABLE'|'SOURCE_LIMIT'|'STALE_SOURCE'|'INVALID_SOURCE' };
export type CanonicalCaptureBundle = { workspaceId:string; actorEmployeeId:string;
  scheduling:CanonicalCaptureInput<SchedulingActionCapture>;
  attendance:CanonicalCaptureInput<AttendanceActionCapture>;
  corrections:CanonicalCaptureInput<CorrectionActionCapture>;
  timecards:CanonicalCaptureInput<TimecardActionCapture> };
export type PreparedCaptureSection = PreparedCanonicalSource | { source:SourceKey;
  state:'loading'|'unavailable'; reason?:string };

/** One pure four-source adapter. Failed/loading sources remain explicitly named;
 * no authorized counts, all-clear claim, alternate fetch engine or ActionMetadata.
 * Expected actor/workspace here are coherence observations, not authentication. */
export function prepareCanonicalActionSources(input: CanonicalCaptureBundle): PreparedCaptureSection[] {
  const value=copyCanonicalCapture(input) as CanonicalCaptureBundle;
  if (!id(value.workspaceId)||!id(value.actorEmployeeId)) throw Error('Invalid internal capture');
  const keys:SourceKey[]=['scheduling','attendance','corrections','timecards'];
  const result:PreparedCaptureSection[]=[];
  for (const source of keys) {
    const section=value[source];
    if (section.state==='loading') { result.push({source,state:'loading'}); continue; }
    if (section.state==='unavailable') {
      if (!['READ_FAILED','ACCESS_DENIED','SCHEMA_UNAVAILABLE','SOURCE_LIMIT','STALE_SOURCE','INVALID_SOURCE'].includes(section.reason)) throw Error('Invalid internal capture');
      result.push({source,state:'unavailable',reason:section.reason}); continue;
    }
    if (section.state!=='captured') throw Error('Invalid internal capture');
    try {
      const capture=section.capture;
      const workspaceId='workspaceId' in capture?capture.workspaceId:capture.source.workspaceId;
      if (workspaceId!==value.workspaceId || capture.actorEmployeeId!==value.actorEmployeeId) throw Error('Invalid internal capture');
      // Branch correlation is explicit; no permission facts or prototype input are supplied.
      const preparedSource=source==='scheduling'?prepareSchedulingActionRows(capture as SchedulingActionCapture):
        source==='attendance'?prepareAttendanceActionRows(capture as AttendanceActionCapture):
        source==='corrections'?prepareCorrectionActionRows(capture as CorrectionActionCapture):prepareTimecardActionRows(capture as TimecardActionCapture);
      result.push(preparedSource);
    } catch { result.push({source,state:'unavailable',reason:'INVALID_SOURCE'}); }
  }
  return copyCanonicalCapture(result) as PreparedCaptureSection[];
}
