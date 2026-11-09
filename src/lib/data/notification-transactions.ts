import {neonNotificationExecutor} from './sql-executor';
export {neonNotificationExecutor} from './sql-executor';
import {assertOperationalAccess,operationalScopeStatements} from '../company-access/operational-scope.server';
import type {OperationalFootprint} from '../company-access/model';
import { currentCalloutReleaseSql } from './shift-change-release';
import type { AssignmentOrigin } from '../domain';
import type { GenerationClaims } from '../scheduling/generation-claims';
import { workspaceReadGuard } from './workspaces';
import type { NotificationConfig } from '../notifications/types';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
import { randomUUID } from 'node:crypto';
import { assignmentCapabilityIssues, workspaceLocationAvailable } from '../scheduling/capabilities';
import { schedulingIssueMessage } from '../scheduling/validate-shift';
import { shiftBoundaryInstants } from '../business-time';
import type { Position, Workspace, Location } from '../domain';
import type { ScheduleStatus } from '../domain';
import type { PublicationRevision } from './publication-revisions';
import type { PublishedShiftSnapshot } from '../assistance/publication-diff';
import { diffPublishedShifts } from '../assistance/publication-diff';
import { buildAcknowledgementState } from '../assistance/acknowledgement-state';
import { canAccessPublishedAssignment } from '../notifications/destinations';
import { buildNotificationIntents } from '../notifications/recipients';
import { loadWorkspaceNotificationConfig } from '../notifications/config';
import { notificationIntentStatements } from './notifications';
import type { SessionMutationProof } from '../shift-changes/types';
import { assertManagementProof, managementSessionStatements } from './management-session';
import { generationSourceSql, generationMutationGuards, type GenerationSource } from './generation-guards';
import { ManualAssignmentConflictError, validateManualAssignments } from './manual-assignment-validation';
import { assertCoverageRepairReview } from './coverage-repair.server';
import { CoverageRepairConflictError } from '../scheduling/coverage-repair';
import type { EmployeePublicationProjection, RecipientAccess, ScheduleSourceSnapshot } from '../notifications/types';
export type GuardedSchedule = {
    id: string;
    locationId: string;
    weekStart: string;
    status: ScheduleStatus;
    updatedAt: string;
};
export type GuardedShift = PublishedShiftSnapshot & {
    assignmentOrigin?: AssignmentOrigin;
    generatedClaims?: GenerationClaims | null;
    hasCalloutHistory?: boolean;
    hasPublicationHistory?: boolean;
    positionId?: string | null;
    sourceShiftId: string;
    scheduleId: string;
    weekStart: string;
    hasExchangeHistory: boolean;
    approvedCalloutEmployeeId?: string | null;
};
export type AssignmentFacts = {
    workspace: Pick<Workspace,'id'|'active'|'timeZone'>;
    locations: Pick<Location,'id'|'workspaceId'|'active'>[];
    positions: Position[];
    memberships: {employeeId:string;positionId:string}[];
};
export type GuardedWeekState = {
    assignmentFacts: AssignmentFacts;
    schedules: GuardedSchedule[];
    shifts: GuardedShift[];
    revisions: (PublicationRevision & {
        shifts: PublishedShiftSnapshot[];
    })[];
    acknowledgements: {
        weekStart: string;
        employeeId: string;
        revisionId: string | null;
    }[];
    recipients: RecipientAccess[];
};
export type WeekMutationBatch = {
    /** Request outcomes may include reviewers who have no assigned shifts. */
    recipientEmployeeIds?: readonly string[];
    /** Ordered business statements, including any request-status assertions. */
    statements: readonly SqlStatement[];
    afterSchedules: readonly GuardedSchedule[];
    afterShifts: readonly GuardedShift[];
    /** Explicit publication records even an unchanged/empty published week. */
    publishWeekStarts?: readonly string[];
    revisionSourceId?: string;
    affectedLocationId?: string;
    /** Publish changes (Jose, 2026-10-29): manual edits to a published week write
     * the live rows plus held-edit history only. No revision, calendar capture,
     * supersede or notification until the Owner taps Publish changes. Draft-only
     * batches may set it too; they simply record no history. */
    deferPublication?: boolean;
    /** History kind for this batch's held rows; derived per shift when omitted. */
    pendingEditKind?: 'COPY';
};
export type PendingEditKind = 'CREATE' | 'UPDATE' | 'DELETE' | 'COPY';
/** What one week's next revision would contain. PUBLISH (an explicit
 * publishWeekStarts entry) and a week never captured snapshot the whole live
 * week. Every other writer patches the latest revision with only its own
 * published change, so held manual edits keep waiting (Jose, 2026-10-29). */
type WeekProjection = { latest?: GuardedWeekState['revisions'][number]; previous: PublishedShiftSnapshot[]; current: PublishedShiftSnapshot[]; mode: 'SNAPSHOT' | 'PATCH' };
function weekProjection(state: GuardedWeekState, batch: WeekMutationBatch, week: string): WeekProjection {
    const latest = state.revisions.filter(r => r.weekStart === week).at(-1);
    const previous = latest?.shifts ?? [];
    const live = publishedShifts(batch.afterSchedules, batch.afterShifts, week);
    if (!latest || batch.publishWeekStarts?.includes(week)) return { latest, previous, current: live, mode: 'SNAPSHOT' };
    return { latest, previous, current: patchPublishedProjection(previous, publishedShifts(state.schedules, state.shifts, week), live), mode: 'PATCH' };
}
const identity = (s: PublishedShiftSnapshot) => s.sourceShiftId ?? null;
const canonicalKey = (s: PublishedShiftSnapshot | undefined) => s ? JSON.stringify(canonicalShifts([s])[0]) : null;
/** Latest revision rows, with each shift this batch changed (live before vs
 * live after) replaced by its new published value or removed. Unchanged rows
 * keep their captured values, including a captured position name. */
export function patchPublishedProjection(latest: readonly PublishedShiftSnapshot[], before: readonly PublishedShiftSnapshot[], after: readonly PublishedShiftSnapshot[]): PublishedShiftSnapshot[] {
    const beforeMap = new Map(before.flatMap(s => identity(s) ? [[identity(s)!, s] as const] : []));
    const afterMap = new Map(after.flatMap(s => identity(s) ? [[identity(s)!, s] as const] : []));
    const changed = [...new Set([...beforeMap.keys(), ...afterMap.keys()])].filter(id => canonicalKey(beforeMap.get(id)) !== canonicalKey(afterMap.get(id))).sort();
    const changedSet = new Set(changed);
    return [...latest.filter(s => !identity(s) || !changedSet.has(identity(s)!)), ...changed.flatMap(id => afterMap.get(id) ? [{ ...afterMap.get(id)!, positionName: undefined }] : [])];
}
/** Pending Publish changes for one week: the latest revision compared with the
 * live published rows (canonical comparison, so a notes-only edit counts). A
 * published week never captured is entirely pending. */
export function pendingPublicationChanges(state: Pick<GuardedWeekState, 'schedules' | 'shifts' | 'revisions'>, week: string) {
    const latest = state.revisions.filter(r => r.weekStart === week).at(-1);
    const previous = latest?.shifts ?? [];
    const current = publishedShifts(state.schedules, state.shifts, week);
    const key = (s: PublishedShiftSnapshot) => identity(s) ?? `fallback:${s.locationId}:${s.employeeId}:${s.date}:${s.startTime}:${s.endTime}`;
    const beforeMap = new Map(previous.map(s => [key(s), s] as const)), afterMap = new Map(current.map(s => [key(s), s] as const));
    const changes = [...new Set([...beforeMap.keys(), ...afterMap.keys()])].sort()
        .filter(id => canonicalKey(beforeMap.get(id)) !== canonicalKey(afterMap.get(id)))
        .map(id => ({ key: id, sourceShiftId: identity(beforeMap.get(id) ?? afterMap.get(id)!), before: beforeMap.get(id) ?? null, after: afterMap.get(id) ?? null }));
    const published = state.schedules.some(s => s.weekStart === week && s.status === 'PUBLISHED');
    return { latest: latest ?? null, previous, current, changes, hasPendingChanges: changes.length > 0 || (published && !latest) };
}
/** Fields a manual edit changes on one assignment; callout release is published
 * by its own approval revision and is not a held edit. */
export function heldEditDiffers(live: PublishedShiftSnapshot, captured: PublishedShiftSnapshot | undefined): boolean {
    if (!captured) return true;
    const facts = (s: PublishedShiftSnapshot) => { const { isCalloutApproved: _c, ...rest } = canonicalShifts([s])[0]; void _c; return JSON.stringify(rest); };
    return facts(live) !== facts(captured);
}
/** History rows for a deferred batch: one per published assignment whose
 * canonical value changed, in the SAME transaction as the live write. */
function pendingEditStatements(state: GuardedWeekState, batch: WeekMutationBatch, weeks: readonly string[], workspaceId: string, actorEmployeeId: string): SqlStatement[] {
    const rows: Record<string, unknown>[] = [];
    for (const week of weeks) {
        const before = new Map(publishedShifts(state.schedules, state.shifts, week).flatMap(s => identity(s) ? [[identity(s)!, s] as const] : []));
        const after = new Map(publishedShifts(batch.afterSchedules, batch.afterShifts, week).flatMap(s => identity(s) ? [[identity(s)!, s] as const] : []));
        for (const id of [...new Set([...before.keys(), ...after.keys()])].sort()) {
            const old = before.get(id), next = after.get(id);
            if (canonicalKey(old) === canonicalKey(next)) continue;
            const kind: PendingEditKind = !old ? (batch.pendingEditKind ?? 'CREATE') : !next ? 'DELETE' : 'UPDATE';
            const shown = next ?? old!;
            rows.push({ id: randomUUID(), week_start: week, location_id: shown.locationId, schedule_id: shown.scheduleId, shift_id: id, kind,
                before_snapshot: old ? canonicalShifts([old])[0] : null, after_snapshot: next ? canonicalShifts([next])[0] : null });
        }
    }
    if (!rows.length) return [];
    return [{ text: `INSERT INTO schedule_pending_edits(id,workspace_id,week_start,location_id,schedule_id,shift_id,kind,before_snapshot,after_snapshot,actor_employee_id,created_at)
      SELECT x.id::uuid,$1,x.week_start,x.location_id,x.schedule_id,x.shift_id,x.kind,x.before_snapshot,x.after_snapshot,$2,clock_timestamp()
      FROM jsonb_to_recordset($3::jsonb) AS x(id text,week_start date,location_id text,schedule_id text,shift_id text,kind text,before_snapshot jsonb,after_snapshot jsonb)`,
        values: [workspaceId, actorEmployeeId, JSON.stringify(rows)] }];
}
/** Derive every old/new schedule and assignment location from the guarded
 * database snapshot. Publication repair and generated provenance are global. */
function operationalWriteFootprint(state:GuardedWeekState,batch:WeekMutationBatch,forceCompany=false):{footprint:OperationalFootprint;scheduleIds:string[]} {
 const ids=new Set<string>(),locations=new Set<string>();let company=forceCompany;
 const beforeSchedules=new Map(state.schedules.map(s=>[s.id,s]));
 const afterSchedules=new Map(batch.afterSchedules.map(s=>[s.id,s]));
 const changedSchedules=new Set([...beforeSchedules.keys(),...afterSchedules.keys()]);
 for(const id of changedSchedules){
  const before=beforeSchedules.get(id),after=afterSchedules.get(id);
  if(JSON.stringify(before)===JSON.stringify(after))continue;
  ids.add(id);
  for(const schedule of [before,after])if(schedule){locations.add(schedule.locationId);if(schedule.status!=='DRAFT')company=true;}
 }
 const beforeShifts=new Map(state.shifts.map(s=>[s.sourceShiftId,s]));
 const afterShifts=new Map(batch.afterShifts.map(s=>[s.sourceShiftId,s]));
 for(const id of new Set([...beforeShifts.keys(),...afterShifts.keys()])){
  const before=beforeShifts.get(id),after=afterShifts.get(id);
  if(JSON.stringify(before)===JSON.stringify(after))continue;
  for(const shift of [before,after])if(shift){
   ids.add(shift.scheduleId);locations.add(shift.locationId);
   const schedule=(shift===before?beforeSchedules:afterSchedules).get(shift.scheduleId);
   if(!schedule||schedule.status!=='DRAFT'||shift.assignmentOrigin==='GENERATED'||shift.generatedClaims)company=true;
  }
 }
 if(batch.publishWeekStarts?.length)company=true;
 // A revision (capture and notification writes) needs COMPANY admission before
 // validation. A deferred manual edit writes none, so held edits elsewhere in
 // the week never widen a location-scoped draft edit; any other writer patches
 // only its own change, so only that change can require COMPANY here.
 if(!batch.deferPublication)for(const week of new Set([...state.schedules,...batch.afterSchedules].map(s=>s.weekStart))){
  const {latest,previous,current}=weekProjection(state,batch,week);
  if((latest||batch.afterSchedules.some(s=>s.weekStart===week&&s.status==='PUBLISHED'))
   &&JSON.stringify(canonicalShifts(previous))!==JSON.stringify(canonicalShifts(current)))company=true;
 }
 return {footprint:company||!locations.size?{kind:'COMPANY'}:{kind:'LOCATIONS',locationIds:[...locations].sort()},scheduleIds:[...ids].sort()};
}
export type WeekMutationResult = {
    committed: boolean;
    revisions: PublicationRevision[];
};
// Read every component in one PostgreSQL statement/MVCC snapshot. Keep database
// timestamps as text; Date round-tripping would silently discard microseconds.
const currentShiftsSql = (weeks="$1") => `SELECT sh.id AS "sourceShiftId", sh.schedule_id AS "scheduleId",
  s.week_start::text AS "weekStart", s.location_id AS "locationId", sh.employee_id AS "employeeId",
  sh.date::text AS date, left(sh.start_time::text,5) AS "startTime", left(sh.end_time::text,5) AS "endTime",
  sh.assignment_origin AS "assignmentOrigin", sh.generated_claims AS "generatedClaims",
  EXISTS (SELECT 1 FROM shift_callouts c WHERE c.shift_id=sh.id) AS "hasCalloutHistory",
  EXISTS (SELECT 1 FROM schedule_publication_revision_shifts r WHERE r.source_shift_id=sh.id) AS "hasPublicationHistory",
  sh.position_id AS "positionId", NULLIF(sh.notes,'') AS notes, sh.is_designated_lead AS "isDesignatedLead",
  EXISTS (SELECT 1 FROM shift_callouts c WHERE ${currentCalloutReleaseSql()}) AS "isCalloutApproved",
  (SELECT c.employee_id FROM shift_callouts c WHERE ${currentCalloutReleaseSql()} LIMIT 1) AS "approvedCalloutEmployeeId",
  EXISTS (SELECT 1 FROM shift_exchanges x WHERE x.source_shift_id=sh.id OR x.target_shift_id=sh.id) AS "hasExchangeHistory"
  FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id WHERE s.week_start=ANY(${weeks}::date[])`;
const revisionShiftsSql = `SELECT source_shift_id AS "sourceShiftId", schedule_id AS "scheduleId", location_id AS "locationId",
  employee_id AS "employeeId", date::text AS date, left(start_time::text,5) AS "startTime", left(end_time::text,5) AS "endTime",
  position_id AS "positionId", position_name AS "positionName", notes, is_designated_lead AS "isDesignatedLead", is_callout_approved AS "isCalloutApproved"
  FROM schedule_publication_revision_shifts WHERE revision_id=r.id`;
export const notificationStateExpression = (weeks="$1") => `jsonb_build_object(
  'assignmentFacts', jsonb_build_object(
    'workspace',(SELECT jsonb_build_object('id',id,'active',active,'timeZone',time_zone) FROM workspaces WHERE singleton=true),
    'locations',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'workspaceId',workspace_id,'active',active) ORDER BY id) FROM locations),'[]'::jsonb),
    'positions',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'workspaceId',workspace_id,'name',name,'active',active,'createdAt',created_at::text,'updatedAt',updated_at::text) ORDER BY id) FROM positions),'[]'::jsonb),
    'memberships',COALESCE((SELECT jsonb_agg(jsonb_build_object('employeeId',employee_id,'positionId',position_id) ORDER BY employee_id,position_id) FROM employee_positions),'[]'::jsonb)),
  'schedules', COALESCE((SELECT jsonb_agg(t ORDER BY t.id) FROM (
    SELECT id, location_id AS "locationId", week_start::text AS "weekStart", status, updated_at::text AS "updatedAt"
    FROM schedules WHERE week_start=ANY(${weeks}::date[])) t),'[]'::jsonb),
  'shifts', COALESCE((SELECT jsonb_agg(t ORDER BY t."sourceShiftId") FROM (${currentShiftsSql(weeks)}) t),'[]'::jsonb),
  'revisions', COALESCE((SELECT jsonb_agg(t ORDER BY t."weekStart",t."revisionNumber") FROM (
    SELECT r.id, r.week_start::text AS "weekStart", r.revision_number AS "revisionNumber", r.source_type AS "sourceType",
    r.source_id AS "sourceId", r.affected_location_id AS "affectedLocationId", r.created_by AS "createdBy", r.created_at::text AS "createdAt",
    COALESCE((SELECT jsonb_agg(rs ORDER BY rs."sourceShiftId") FROM (${revisionShiftsSql}) rs),'[]'::jsonb) AS shifts
    FROM schedule_publication_revisions r WHERE r.week_start=ANY(${weeks}::date[])) t),'[]'::jsonb),
  'acknowledgements', COALESCE((SELECT jsonb_agg(t ORDER BY t."weekStart",t."employeeId") FROM (
    SELECT week_start::text AS "weekStart", employee_id AS "employeeId", publication_revision_id AS "revisionId"
    FROM schedule_acknowledgements WHERE week_start=ANY(${weeks}::date[])) t),'[]'::jsonb),
  'recipients', COALESCE((SELECT jsonb_agg(t ORDER BY t."employeeId") FROM (
    SELECT e.id AS "employeeId", e.role, e.active,
    COALESCE((SELECT jsonb_agg(location_id ORDER BY location_id) FROM employee_location_eligibility elig JOIN locations l ON l.id=elig.location_id AND l.active=true WHERE employee_id=e.id),'[]'::jsonb) AS "allowedLocationIds"
    FROM employees e) t),'[]'::jsonb))`;
/** Shared authoritative read used by reminder/open/worker checks. */
export const notificationStateSql = notificationStateExpression();
export const notificationWeekReadSql = (weeks="$1") => `SELECT ${notificationStateExpression(weeks)} AS state`;
export async function readNotificationWeekState(weeks: readonly string[], executor: SqlExecutor): Promise<GuardedWeekState> {
    const [row] = await executor.query<{state: GuardedWeekState}>({text: `SELECT ${notificationStateSql} AS state`, values: [[...weeks]]});
    if (!row) throw new Error('Schedule snapshot could not be read.');
    return row.state;
}
/** Reminder insertion uses the same exact snapshot guard after taking the week lock. */
export function notificationWeekStateGuard(week: string, state: GuardedWeekState): SqlStatement {
    return {text:`SELECT (CASE WHEN ${notificationStateSql} = $2::jsonb THEN '1' ELSE 'notification_source_conflict' END)::integer`,values:[[week],JSON.stringify(state)]};
}
/** Common week lock used by all schedule writers and explicit acknowledgement. */
export function scheduleWeekLockStatements(weekStarts: readonly string[]): SqlStatement[] {
    return [...new Set(weekStarts)].sort().map(week => ({
        text: `SELECT pg_advisory_xact_lock(hashtextextended('schedule-week:' || $1::text, 0))`, values: [week],
    }));
}
function publishedShifts(schedules: readonly GuardedSchedule[], shifts: readonly GuardedShift[], week: string): PublishedShiftSnapshot[] {
    const ids = new Set(schedules.filter(s => s.weekStart === week && s.status === 'PUBLISHED').map(s => s.id));
    return shifts.filter(s => ids.has(s.scheduleId)).map(s => ({
        sourceShiftId: s.sourceShiftId, scheduleId: s.scheduleId, locationId: s.locationId, employeeId: s.employeeId, date: s.date, startTime: s.startTime, endTime: s.endTime, positionId:s.positionId || undefined, positionName:s.positionName || undefined, notes: s.notes || undefined, isDesignatedLead: s.isDesignatedLead, isCalloutApproved: s.isCalloutApproved
    }));
}
function canonicalShifts(shifts: readonly PublishedShiftSnapshot[]) {
    return [...shifts].sort((a, b) => (a.sourceShiftId ?? '') < (b.sourceShiftId ?? '') ? -1 : (a.sourceShiftId ?? '') > (b.sourceShiftId ?? '') ? 1 : 0).map(s => ({
        sourceShiftId: s.sourceShiftId, scheduleId: s.scheduleId, locationId: s.locationId, employeeId: s.employeeId, date: s.date,
        startTime: s.startTime, endTime: s.endTime, positionId:s.positionId || null, notes: s.notes || null, isDesignatedLead: s.isDesignatedLead, isCalloutApproved: s.isCalloutApproved,
    }));
}
/**
 * Derive each recipient's latest material personal version, which may precede
 * the global week revision when another employee's assignment changed. The
 * acknowledgement comparison still uses the latest published week snapshot.
 */
export function personalProjections(state: GuardedWeekState, week: string): Record<string, EmployeePublicationProjection> {
    const history = state.revisions.filter(r => r.weekStart === week);
    const latest = history.at(-1);
    if (!latest)
        return {};
    return Object.fromEntries(state.recipients.map(recipient => {
        let effective = history[0];
        for (let index = history.length - 1; index >= 0; index--) {
            const previous = history[index - 1]?.shifts ?? [];
            if (diffPublishedShifts(previous.filter(s => canAccessPublishedAssignment(recipient, s)), history[index].shifts.filter(s => canAccessPublishedAssignment(recipient, s))).length) {
                effective = history[index];
                break;
            }
        }
        const ackId = state.acknowledgements.find(a => a.weekStart === week && a.employeeId === recipient.employeeId)?.revisionId ?? undefined;
        const ackShifts = history.find(r => r.id === ackId)?.shifts;
        return [recipient.employeeId, {
                effectiveVersion: effective.id, publishedAt: effective.createdAt,
                acknowledgement: buildAcknowledgementState({
                    employeeId: recipient.employeeId, latestRevisionId: latest.id, acknowledgementRevisionId: ackId, acknowledgedRevisionShifts: ackShifts, latestRevisionShifts: latest.shifts
                }), acknowledgedRevisionShifts: ackShifts
            }];
    }));
}
/** Same-batch cancellation includes claimed deliveries; workers still revalidate. */
function supersedePersonalStatements(week: string, employeeId: string, environment: string): SqlStatement[] {
    return [{
            text: `WITH cancelled AS (
    UPDATE notifications SET push_state='cancelled', cancelled_at=now()
    WHERE source_kind='SCHEDULE' AND source_id=$1 AND environment=$2 AND employee_id=$3
      AND push_state IN ('pending','materialized','no_active_subscription') RETURNING id
  ) UPDATE push_deliveries SET status='cancelled', lease_token=NULL, lease_expires_at=NULL, updated_at=now()
    WHERE notification_id IN (SELECT id FROM cancelled) AND status IN ('queued','retry_pending','processing')`, values: [week, environment, employeeId]
        }];
}
/** The only publication/write protocol. Ordinary callers rebuild a conflicted
 * whole batch at most three times; gap repairs require an explicit fresh review. */
type ManagementWeekAuthority = { sourceType: 'MANAGER_MUTATION' | 'PUBLISH'; proof: SessionMutationProof } | { sourceType: 'EXCHANGE' | 'CALLOUT'; proof?: never };
/**
 * Commit business statements, publication snapshots, calendar removals and
 * notification intents atomically. The builder runs outside the SQL transaction
 * and may run again after conflicts, so it must describe effects without sending
 * notifications or performing independent writes. Exact before/after guards turn
 * stale or conditional no-op writes into failures instead of false success.
 * Gap repairs retain the original review and require user review after conflict.
 */
export async function commitPublishedWeekChange(input: ManagementWeekAuthority & {
    weekStarts: readonly string[];
    actorEmployeeId: string;
    sourceId?: string;
    coverageRepairReview?: string;
    build: (snapshot: GuardedWeekState, config: NotificationConfig) => WeekMutationBatch;
}, executor: SqlExecutor = neonNotificationExecutor()): Promise<WeekMutationResult> {
    if (input.sourceType === 'MANAGER_MUTATION' || input.sourceType === 'PUBLISH') assertManagementProof(input.proof, input.actorEmployeeId);
    if(input.sourceType==='PUBLISH'||input.coverageRepairReview!==undefined)await assertOperationalAccess(input.proof!,{kind:'COMPANY'},executor);
    const weeks = [...new Set(input.weekStarts)].sort();
    if (!weeks.length)
        return {
            committed: false, revisions: []
        };
    for (let attempt = 0; attempt < 3; attempt++) {
        const config = await loadWorkspaceNotificationConfig(process.env,executor);
        const [read] = await executor.query<{
            state: GuardedWeekState;
            source?: GenerationSource;
            read_at: string;
        }>({
            text: `SELECT ${notificationStateSql} AS state, clock_timestamp()::text AS read_at${input.sourceType === 'MANAGER_MUTATION' ? `, ${generationSourceSql} AS source` : ''}`, values: [weeks]
        });
        if (!read)
            throw new Error('Schedule snapshot could not be read.');
        const state = read.state;
        // A repair retains its ORIGINAL reviewed source on every retry. Ordinary
        // callers still rebuild against a fresh source after a version conflict.
        if (input.coverageRepairReview !== undefined) {
            if (input.sourceType !== 'MANAGER_MUTATION') throw new CoverageRepairConflictError();
            assertCoverageRepairReview(read.source, input.coverageRepairReview, input.proof);
        }
        // Builders receive an isolated value so accidental mutation cannot weaken the guard.
        const batch = input.build(structuredClone(state),config);
        if (!batch.statements.length)
            return {
                committed: false, revisions: []
            };
        if(input.sourceType==='MANAGER_MUTATION')await assertOperationalAccess(input.proof,operationalWriteFootprint(state,batch,input.coverageRepairReview!==undefined).footprint,executor);
        const {guards,statements,revisions}=preparePublishedWeekChange({...input,state,batch,config,schedulingSource:read.source,observedAt:read.read_at});
        try {
            await executor.transaction([...guards,...statements]);
            return {
                committed: true, revisions
            };
        }
        catch (error) {
            const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
            const conflict = code === '22P02' && error instanceof Error && /schedule_week_version_conflict|generation_source_conflict/.test(error.message);
            if (input.coverageRepairReview !== undefined && (conflict || code === '40001' || code === '40P01' || code === '55P03' || code === '57014'))
                throw new CoverageRepairConflictError();
            if (attempt === 2 || !(conflict || code === '40001' || code === '40P01'))
                throw error;
        }
    }
    throw new Error('Schedule version retries exhausted.');
}

export type PublishedChangePlanInput = ManagementWeekAuthority & {
    weekStarts: readonly string[]; actorEmployeeId: string; sourceId?: string;
    suppressPublicationEventEmployeeIds?:readonly string[]; revisionWeekStarts?:readonly string[]; state: GuardedWeekState; batch: WeekMutationBatch; config: NotificationConfig; observedAt: string;
    schedulingSource?: GenerationSource;
    coverageRepairReview?: string;
};
export type PreparedPublishedChange = { guards: SqlStatement[]; statements: SqlStatement[]; revisions: PublicationRevision[] };
/**
 * Assemble the guarded publication protocol from before/after values without I/O.
 * Changed assignments receive current capability/rule validation; retained history
 * is preserved. Draft-only work has no publication revision, while a changed
 * published projection captures the whole week and its outbox in the same batch.
 * The caller owns execution/retries and must not reorder the returned guards.
 */
export function preparePublishedWeekChange(input: PublishedChangePlanInput): PreparedPublishedChange {
 const {state,batch,config}=input;
 const weeks=[...new Set(input.weekStarts)].sort();
 const operational=operationalWriteFootprint(state,batch,input.sourceType==='PUBLISH'||input.coverageRepairReview!==undefined);
        // Only a changed assignment requires current eligibility. Retained historical
        // inactive facts and request-status-only writes must remain readable/writable.
        const assignments = batch.afterShifts.filter(next => {
            const before = state.shifts.find(s => s.sourceShiftId === next.sourceShiftId);
            return !before || ['employeeId','locationId','date','startTime','endTime','isDesignatedLead'].some(key => before[key as keyof GuardedShift] !== next[key as keyof GuardedShift]) || (before.positionId || null) !== (next.positionId || null);
        });
        for (const shift of assignments) {
            const facts=state.assignmentFacts;
            const employee=state.recipients.find(r=>r.employeeId===shift.employeeId);
            if (!facts?.workspace) throw new Error('Workspace configuration is unavailable.');
            const issues=assignmentCapabilityIssues({candidate:shift,workspace:facts.workspace,location:facts.locations.find(l=>l.id===shift.locationId),position:facts.positions.find(p=>p.id===shift.positionId),employee:{active:employee?.active ?? false,role:employee?.role ?? 'EMPLOYEE',eligibleLocationIds:employee?.allowedLocationIds ?? [],positionIds:facts.memberships.filter(m=>m.employeeId===shift.employeeId).map(m=>m.positionId)}});
            if(issues.length) {
                const message = schedulingIssueMessage(issues[0]);
                if (input.sourceType === 'MANAGER_MUTATION') throw new ManualAssignmentConflictError(issues[0], message);
                throw new Error(message);
            }
            shiftBoundaryInstants(shift,facts.workspace.timeZone);
        }
        const validateManual = input.sourceType === 'MANAGER_MUTATION' && assignments.length > 0;
        if (validateManual) validateManualAssignments(input.schedulingSource, assignments);
        const relevantIds = [...new Set([input.actorEmployeeId, ...state.shifts.map(s => s.employeeId), ...batch.afterShifts.map(s => s.employeeId), ...(batch.recipientEmployeeIds ?? [])])].sort();
        const newSchedules=batch.afterSchedules.filter(s=>!state.schedules.some(before=>before.id===s.id));
        for (const schedule of newSchedules) {
            const facts=state.assignmentFacts;
            if (!facts?.workspace || !workspaceLocationAvailable(facts.workspace,facts.locations.find(l=>l.id===schedule.locationId),schedule.locationId)) {
                if (input.sourceType === 'MANAGER_MUTATION') throw new ManualAssignmentConflictError('LOCATION_INACTIVE', schedulingIssueMessage('LOCATION_INACTIVE'));
                else throw new Error(schedulingIssueMessage('LOCATION_INACTIVE'));
            }
        }
        const locationIds=[...new Set([...assignments.map(s=>s.locationId),...newSchedules.map(s=>s.locationId)])].sort();
        const positionIds=[...new Set(assignments.flatMap(s=>s.positionId?[s.positionId]:[]))].sort();
        const guards: SqlStatement[] = validateManual ? [
            // Established global protocol FIRST: never upgrade workspace SHARE
            // after taking week/employee locks. It pins the complete dated ledger,
            // leave, availability and configured rules across all locations/weeks.
            ...generationMutationGuards(input.schedulingSource!, weeks),
            ...managementSessionStatements(input.proof!, input.actorEmployeeId),
        ] : [
            ...workspaceReadGuard(config.workspace!),
            ...scheduleWeekLockStatements(weeks),
            // Compatible SHARE locks allow publications on unrelated weeks concurrently.
            // Existing employee creation inserts employees before eligibility; it cannot
            // reference an uncommitted new employee from an existing schedule shift.
            {
                text: 'SELECT id FROM employees WHERE id=ANY($1::text[]) ORDER BY id FOR SHARE', values: [relevantIds]
            },
            {text:'SELECT id FROM locations WHERE id=ANY($1::text[]) ORDER BY id FOR SHARE',values:[locationIds]},
            {text:'SELECT id FROM positions WHERE id=ANY($1::text[]) ORDER BY id FOR SHARE',values:[positionIds]},
            {text:'LOCK TABLE employee_positions IN SHARE MODE',values:[]},
            {
                text: 'LOCK TABLE employee_location_eligibility IN SHARE MODE', values: []
            },
            ...((input.sourceType === 'MANAGER_MUTATION' || input.sourceType === 'PUBLISH') ? managementSessionStatements(input.proof, input.actorEmployeeId) : []),
        ];
        const stamp:SqlStatement=input.sourceType==='MANAGER_MUTATION'?{text:`UPDATE schedules SET updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 microsecond') WHERE id=ANY($1::text[])`,values:[operational.scheduleIds]}:{text:`UPDATE schedules SET updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 microsecond') WHERE week_start=ANY($1::date[])`,values:[weeks]};
        const statements: SqlStatement[] = [
            {
                text: `SELECT (CASE WHEN ${notificationStateSql} = $2::jsonb THEN '1' ELSE 'schedule_week_version_conflict' END)::integer AS guarded`, values: [weeks, JSON.stringify(state)]
            },
            ...batch.statements,
            // Monotonic even for writers whose transactions began before a lock wait.
            stamp,
        ];
        // Check ALL actual writes, including drafts. A conditional delete/update
        // that became a no-op must abort/recompute rather than return false success.
        statements.push({
            text: `SELECT (CASE WHEN
      COALESCE((SELECT jsonb_agg(to_jsonb(t) - 'weekStart' - 'hasExchangeHistory' - 'approvedCalloutEmployeeId' - 'hasCalloutHistory' - 'hasPublicationHistory' ORDER BY t."sourceShiftId" COLLATE "C") FROM (${currentShiftsSql()}) t),'[]'::jsonb)=$2::jsonb
      AND COALESCE((SELECT jsonb_agg(t ORDER BY t.id COLLATE "C") FROM (
        SELECT id,location_id AS "locationId",week_start::text AS "weekStart",status FROM schedules WHERE week_start=ANY($1::date[])) t),'[]'::jsonb)=$3::jsonb
      THEN '1' ELSE 'schedule_week_version_conflict' END)::integer AS guarded_after`,
            values: [weeks, JSON.stringify(canonicalShifts(batch.afterShifts).map(shift=>{const actual=batch.afterShifts.find(s=>s.sourceShiftId===shift.sourceShiftId)!;return {...shift,assignmentOrigin:actual.assignmentOrigin??'MANAGER',generatedClaims:actual.generatedClaims??null};})), JSON.stringify([...batch.afterSchedules].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0).map(s => ({
                    id: s.id, locationId: s.locationId, weekStart: s.weekStart, status: s.status
                })))]
        });
        const revisions: PublicationRevision[] = [];
        // Held manual edits: live rows plus history, nothing published or sent.
        if (batch.deferPublication) statements.push(...pendingEditStatements(state, batch, weeks, config.workspace!.id, input.actorEmployeeId));
        for (const week of batch.deferPublication ? [] : weeks) {
            if(input.revisionWeekStarts && !input.revisionWeekStarts.includes(week))continue;
            const {latest,previous,current,mode} = weekProjection(state, batch, week);
            const changedActual = JSON.stringify(canonicalShifts(previous)) !== JSON.stringify(canonicalShifts(current));
            if (!batch.publishWeekStarts?.includes(week) && !changedActual)
                continue;
            // Draft-only writes never publish or create a historical revision.
            if (!batch.afterSchedules.some(s => s.weekStart === week && s.status === 'PUBLISHED') && !latest)
                continue;
            const revision: PublicationRevision = {
                id: randomUUID(), weekStart: week, revisionNumber: (latest?.revisionNumber ?? 0) + 1, sourceType: input.sourceType, sourceId: batch.revisionSourceId ?? input.sourceId, affectedLocationId: batch.affectedLocationId, createdBy: input.actorEmployeeId, createdAt: new Date(input.observedAt).toISOString()
            };
            revisions.push(revision);
            statements.push({
                text: `INSERT INTO schedule_publication_revisions (id,week_start,revision_number,source_type,source_id,created_by,created_at,affected_location_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, values: [revision.id, week, revision.revisionNumber, input.sourceType, revision.sourceId ?? null, input.actorEmployeeId, revision.createdAt, revision.affectedLocationId ?? null]
            });
            if (mode === 'SNAPSHOT') {
            statements.push({
                text: `INSERT INTO schedule_publication_revision_shifts (id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time,notes,is_designated_lead,is_callout_approved,position_id,position_name)
        SELECT $1 || ':' || sh.id,$1,sh.id,sh.schedule_id,s.location_id,sh.employee_id,sh.date,sh.start_time,sh.end_time,sh.notes,sh.is_designated_lead,
        EXISTS(SELECT 1 FROM shift_callouts c WHERE ${currentCalloutReleaseSql()}),sh.position_id,(SELECT p.name FROM positions p WHERE p.id=sh.position_id)
        FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id WHERE s.week_start=$2 AND s.status='PUBLISHED'`, values: [revision.id, week]
            });
            // The whole live week is now published, held edits included.
            statements.push({text:`UPDATE schedule_pending_edits SET published_revision_id=$1,published_at=$2::timestamptz WHERE week_start=$3::date AND published_revision_id IS NULL`,values:[revision.id,revision.createdAt,week]});
            } else {
            // Built from values: the latest captured week plus only this batch's
            // own change, never the live week (which may hold unpublished edits).
            statements.push({
                text: `INSERT INTO schedule_publication_revision_shifts (id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time,notes,is_designated_lead,is_callout_approved,position_id,position_name)
        SELECT $1 || ':' || x.row_key,$1,x.source_shift_id,x.schedule_id,x.location_id,x.employee_id,x.date,x.start_time,x.end_time,x.notes,x.is_designated_lead,x.is_callout_approved,x.position_id,
        CASE WHEN x.captured THEN x.position_name ELSE (SELECT p.name FROM positions p WHERE p.id=x.position_id) END
        FROM jsonb_to_recordset($2::jsonb) AS x(row_key text,source_shift_id text,schedule_id text,location_id text,employee_id text,date date,start_time time,end_time time,notes text,is_designated_lead boolean,is_callout_approved boolean,position_id text,position_name text,captured boolean)`,
                values: [revision.id, JSON.stringify(current.map((s, index) => ({ row_key: s.sourceShiftId ?? `legacy-${index}`, source_shift_id: s.sourceShiftId ?? null, schedule_id: s.scheduleId, location_id: s.locationId,
                    employee_id: s.employeeId, date: s.date, start_time: s.startTime, end_time: s.endTime, notes: s.notes ?? null, is_designated_lead: s.isDesignatedLead, is_callout_approved: s.isCalloutApproved,
                    position_id: s.positionId || null, position_name: s.positionName ?? null, captured: previous.includes(s) })))]
            });
            }
            // Reference previous own published facts atomically, including a
            // callout release. No schedule body is copied into calendar state.
            statements.push({text:'SELECT calendar_capture_removals($1)',values:[revision.id]});
            const projections = personalProjections(state, week);
            const source: ScheduleSourceSnapshot = {
                kind: 'SCHEDULE', source: {
                    kind: 'SCHEDULE', id: week, version: revision.id
                }, updatedAt: revision.createdAt, revision, previousShifts: previous, currentShifts: current, employeePublications: projections
            };
            const before: ScheduleSourceSnapshot | undefined = latest ? {
                ...source, source: {
                    kind: 'SCHEDULE', id: week, version: latest.id
                }, revision: latest, currentShifts: previous
            } : undefined;
            for (const employeeId of new Set(diffPublishedShifts(previous, current).flatMap(change => change.affectedEmployeeIds)))
                statements.push(...supersedePersonalStatements(week, employeeId, config.environment));
            statements.push(...notificationIntentStatements(buildNotificationIntents({
                before, after: source, actorEmployeeId: input.actorEmployeeId, recipients: state.recipients, environment: config.environment, policy: config.policy, now: new Date(input.observedAt)
            }).filter(intent=>intent.purpose!=='EVENT'||!input.suppressPublicationEventEmployeeIds?.includes(intent.employeeId))));
        }
 // Publication, history and notification DML may wait after initial authorization.
 // Recheck wall-clock validity before this SAME transaction can commit.
 if(revisions.length){
  stamp.text=`UPDATE schedules SET updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 microsecond') WHERE week_start=ANY($1::date[])`;
  stamp.values=[weeks];
 }
 if (input.sourceType === 'MANAGER_MUTATION' || input.sourceType === 'PUBLISH') {
  const footprint:OperationalFootprint=revisions.length?{kind:'COMPANY'}:operational.footprint;
  guards.push(...operationalScopeStatements(input.proof,config.workspace!,footprint));
  statements.push(...operationalScopeStatements(input.proof,config.workspace!,footprint));
 }
 return {guards,statements,revisions};
}
