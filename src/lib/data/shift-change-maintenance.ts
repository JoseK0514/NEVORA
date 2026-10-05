import type { NotificationConfig, SqlExecutor, SqlStatement, SourceSnapshot, RecipientAccess } from '../notifications/types';
import type { ShiftTerms, ShiftChangeRequest } from '../shift-changes/types';
import { projectShiftChangeState, planShiftChangeMaintenance, type MaintenanceSnapshot } from '../shift-changes/maintenance';
import { generationSourceSql, generationMutationGuards, type GenerationSource, type GenerationSourceRow } from './generation-guards';
import { mapSchedulingSourceFacts } from './scheduling-source-facts';
import { resolveShiftChangePolicy } from '../shift-changes/policy';
import { sourceShiftTerms, sameShiftTerms, calloutReleasesShift } from '../shift-changes/terms';
import { evaluateCoverageCandidates, type ShiftChangeCandidateSnapshot } from '../scheduling/shift-change-evaluation';
import { requestSnapshot, guardedRequestMutation } from './request-notifications';
import { notificationIntentStatements, cancelNotificationStatements } from './notifications';
import { buildNotificationIntents } from '../notifications/recipients';
import { shiftChangeEvent } from './shift-change-history';
import { affectedWorkweeks, shiftPeriod } from '../scheduling/periods';
import type { ExchangeRecord } from './exchanges';
export type MaintenanceDeps = {
    executor: SqlExecutor;
    clock(): Date;
    config: NotificationConfig;
    cursor?: string;
    limit?: number;
};
export type MaintenanceReport = {
    scanned: number;
    expired: number;
    escalated: number;
    invited: number;
    conflicts: number;
    nextCursor: string | null;
};
type SystemSnapshot = {
    databaseObservedAt: string;
    lifecycle: MaintenanceSnapshot;
    scheduling: ShiftChangeCandidateSnapshot;
    row: GenerationSourceRow;
    recipients: RecipientAccess[];
    eligibleEmployeeIds: string[];
};
/** Read-only, coherent system source. No employee/session identity is synthesized. */
export async function readShiftChangeMaintenanceSnapshot(requestId: string, kind: 'EXCHANGE' | 'CALLOUT', executor: SqlExecutor, now?: Date): Promise<SystemSnapshot | null> {
    const [read] = await executor.query<{
        source: GenerationSource;
        observedAt: string;
    }>({ text: `SELECT ${generationSourceSql} AS source,to_jsonb(clock_timestamp()) AS "observedAt"`, values: [] });
    if (!read?.source)
        return null;
    const source = read.source, w = source.workspaces[0], row = (kind === 'EXCHANGE' ? source.shift_exchanges : source.shift_callouts).find(r => r.id === requestId);
    if (!row || !w?.active)
        return null;
    const dates = source.shifts.map(s => String(s.date)).sort(), observedAt = now?.toISOString() ?? read.observedAt;
    const facts = mapSchedulingSourceFacts(source, { workspaceId: String(w.id), startDate: dates[0] ?? observedAt.slice(0, 10), endDate: dates.at(-1) ?? observedAt.slice(0, 10), retainAdjacentCommitments: true });
    const ledger = source.shifts.flatMap(s => { const p = facts.schedules.find(p => p.id === s.schedule_id); return p ? [sourceShiftTerms(s, p, String(w.id), String(w.time_zone))] : []; });
    const policy = resolveShiftChangePolicy(w.shift_change_policy), scope = policy?.[row.kind === 'SWAP' ? 'swap' : 'coverage'];
    const request: ShiftChangeRequest | null = kind === 'EXCHANGE' ? { id: requestId, kind: row.kind as 'SWAP' | 'COVERAGE', status: row.status as ShiftChangeRequest['status'], revision: Number(row.request_revision), legacyManual: row.legacy_manual === true, requestedByEmployeeId: String(row.requested_by_employee_id), targetEmployeeId: row.target_employee_id ? String(row.target_employee_id) : null, requesterConsent: row.requester_consent as ShiftChangeRequest['requesterConsent'], targetConsent: row.target_consent as ShiftChangeRequest['targetConsent'], recordedApprovalMode: row.recorded_approval_mode as ShiftChangeRequest['recordedApprovalMode'], effectiveApprovalMode: scope?.mode ?? null } : null;
    const live = ledger.find(t => t.shiftId === (row.source_shift_id ?? row.shift_id));
    const original = (row.source_terms ?? request?.requesterConsent?.source ?? null) as ShiftTerms | null;
    const target = (row.target_terms ?? request?.requesterConsent?.target ?? null) as ShiftTerms | null;
    if (request && live && row.linked_callout_id) {
        const c = source.shift_callouts.find(c => c.id === row.linked_callout_id), sh = source.shifts.find(s => s.id === live.shiftId), p = facts.schedules.find(s => s.id === live.scheduleId);
        if (c && sh && p && calloutReleasesShift(c, sh, p, String(w.id), String(w.time_zone)))
            request.releaseAuthorization = { calloutId: String(c.id), reviewedBy: String(c.reviewed_by), source: live };
    }
    const scheduling: ShiftChangeCandidateSnapshot = { source, facts, observedAt, request, policy, profiles: facts.employees.map(e => ({ employeeId: e.id, profile: e.operationalProfile! })), ledger, publication: facts.schedules.map(s => ({ scheduleId: s.id, status: s.status })) };
    const current = (t: ShiftTerms | null) => {
        try {
            return !!t && ledger.some(l => sameShiftTerms(t, l)) && scheduling.publication.some(p => p.scheduleId === t.scheduleId && p.status === 'PUBLISHED');
        }
        catch {
            return false;
        }
    };
    const lifecycle: MaintenanceSnapshot = { id: requestId, kind, workflow: row.kind === 'SWAP' ? 'SWAP' : 'COVERAGE', status: String(row.status), revision: Number(row.request_revision), legacyManual: row.legacy_manual === true, completionDeadline: row.completion_deadline ? String(row.completion_deadline) : null, source: original ?? live ?? null, target, policy, escalatedAt: row.escalated_at ? String(row.escalated_at) : null, termsCurrent: current(original) && (!target || current(target)) };
    const effective = projectShiftChangeState(lifecycle, new Date(observedAt));
    const candidates = kind === 'EXCHANGE' && row.kind === 'COVERAGE' && row.status === 'OPEN' && effective.actionable && (request?.requesterConsent || request?.releaseAuthorization) ? evaluateCoverageCandidates(scheduling) : [];
    const eligibleEmployeeIds = candidates.filter(c => ['ELIGIBLE', 'MANAGER_REVIEW'].includes(c.evaluation.decision)).map(c => c.employeeId);
    lifecycle.eligibilityUnverified = candidates.some(c => c.evaluation.decision === 'UNVERIFIED');
    lifecycle.unfilled = !!request?.releaseAuthorization;
    lifecycle.eligibleCount = eligibleEmployeeIds.length;
    const escalationEvents = source.shift_change_events.filter(e => e.request_kind === kind && e.request_id === requestId && e.event_kind === 'ESCALATED');
    if (escalationEvents.length)
        lifecycle.escalatedStages = escalationEvents.flatMap(e => { const stage = (e.participants as Record<string, unknown>).maintenanceStage; return stage === 'INITIAL' || stage === 'URGENT' ? [stage] : ['INITIAL' as const, 'URGENT' as const]; });
    const recipients = facts.employees.map(e => ({ employeeId: e.id, role: e.role, active: e.active, allowedLocationIds: e.eligibleLocationIds }));
    return { databaseObservedAt: read.observedAt, lifecycle, scheduling, row, recipients, eligibleEmployeeIds };
}
export function maintenanceExchangeSource(snapshot: SystemSnapshot, record?: ExchangeRecord): Extract<SourceSnapshot, {
    kind: 'EXCHANGE';
}> {
    const { lifecycle: l, row: r, scheduling: s } = snapshot, t = l.source!;
    const shift = (t: ShiftTerms) => ({ id: t.shiftId, scheduleId: t.scheduleId, employeeId: t.employeeId, employeeName: '', locationId: t.locationId, locationName: s.facts.locations.find(x => x.id === t.locationId)?.name ?? '', weekStart: t.weekStart, date: t.date, startTime: t.startTime, endTime: t.endTime, positionId: t.positionId ?? undefined, positionName:s.facts.positions.find(p=>p.id===t.positionId)?.name,isDesignatedLead: t.isDesignatedLead });
    const current: ExchangeRecord = record ?? { id: l.id, requestRevision: l.revision, kind: l.workflow, status: l.status as ExchangeRecord['status'], requestedByEmployeeId: String(r.requested_by_employee_id), requestedByName: '', requestedByRole: s.facts.employees.find(e => e.id === r.requested_by_employee_id)?.role ?? 'EMPLOYEE', targetEmployeeId: r.target_employee_id ? String(r.target_employee_id) : undefined, sourceShift: shift(t), targetShift: l.target ? shift(l.target) : undefined, createdAt: String(r.created_at) };
    const effective = projectShiftChangeState(l, new Date(s.observedAt));
    return { ...requestSnapshot('EXCHANGE', { ...current, status: effective.status as ExchangeRecord['status'] }), eligibleEmployeeIds: snapshot.eligibleEmployeeIds, completionDeadline: effective.completionDeadline, semanticNeedKey: JSON.stringify([t?.shiftId, t?.assignmentEpisodeId, t?.termsRevision]), attentionReason: effective.attention ?? undefined };
}
/** Trusted server entry. Bounded retries rebuild source and never call a provider. */
export async function runShiftChangeMaintenance(deps: MaintenanceDeps): Promise<MaintenanceReport> {
    const report: MaintenanceReport = { scanned: 0, expired: 0, escalated: 0, invited: 0, conflicts: 0, nextCursor: deps.cursor ?? '' };
    if (!deps.config.workspace?.active)
        throw Error('Maintenance requires an explicit active workspace');
    const limit = Math.max(1, Math.min(50, Math.floor(deps.limit ?? 10))), started = performance.now();
    const rows = await deps.executor.query<{
        kind: 'EXCHANGE' | 'CALLOUT';
        id: string;
        cursor: string;
    }>({ text: `SELECT kind,id,kind||':'||id AS cursor FROM (SELECT 'EXCHANGE' AS kind,id FROM shift_exchanges WHERE status IN ('OPEN','EMPLOYEE_PENDING','MANAGER_PENDING') UNION ALL SELECT 'CALLOUT',id FROM shift_callouts WHERE status='PENDING') pending WHERE kind||':'||id>$1 ORDER BY kind||':'||id LIMIT $2`, values: [deps.cursor ?? '', limit + 1] });
    for (const row of rows.slice(0, limit)) {
        if (performance.now() - started > deps.config.policy.budgetMs - 2000)
            break;
        let finished = false;
        for (let attempt = 0; attempt < 3; attempt++) {
            const now = deps.clock(), s = await readShiftChangeMaintenanceSnapshot(row.id, row.kind, deps.executor, now);
            if (!s) {
                finished = true;
                break;
            }
            if (s.scheduling.facts.workspace.id !== deps.config.workspace.id || s.scheduling.facts.workspace.timeZone !== deps.config.workspace.timeZone)
                throw Error('Maintenance workspace changed');
            const plans = planShiftChangeMaintenance(s.lifecycle, now, deps.config.policy);
            if (!plans.length) {
                finished = true;
                break;
            }
            const effective = projectShiftChangeState(s.lifecycle, now);
            const invitationIds = new Set<string>();
            const statements: SqlStatement[] = [], l = s.lifecycle, mutation = plans.find(p => p.kind !== 'INVITE');
            if (mutation) {
                const table = row.kind === 'EXCHANGE' ? 'shift_exchanges' : 'shift_callouts';
                statements.push(guardedRequestMutation({ text: `UPDATE ${table} SET ${mutation.kind === 'EXPIRE' ? "status='EXPIRED',resolved_at=clock_timestamp(),outcome_reason='COMPLETION_DEADLINE'" : "escalated_at=clock_timestamp()"} WHERE id=$1 AND request_revision=$2 RETURNING id`, values: [row.id, l.revision] }));
                statements.push(shiftChangeEvent({ workspaceId: deps.config.workspace.id, kind: row.kind, requestId: row.id, revision: l.revision + 1, event: mutation.kind === 'EXPIRE' ? 'EXPIRED' : 'ESCALATED', actorId: null, source: l.source, target: l.target, participants: row.kind === 'CALLOUT' ? { employeeId: s.row.employee_id, maintenanceStage: mutation.stage } : { requesterEmployeeId: s.row.requested_by_employee_id, targetEmployeeId: s.row.target_employee_id, maintenanceStage: mutation.stage }, mode: 'SYSTEM', outcomeReason: mutation.reason }));
                if (mutation.kind === 'EXPIRE') {
                    statements.push(...cancelNotificationStatements({ kind: row.kind, id: row.id, version: `r:${l.revision}` }), ...cancelNotificationStatements({ kind: row.kind, id: row.id, version: l.status }));
                    l.status = 'EXPIRED';
                }
                l.revision++;
            }
            if (row.kind === 'EXCHANGE' && l.source) {
                const source = maintenanceExchangeSource(s);
                const intents = buildNotificationIntents({ after: source, recipients: s.recipients, environment: deps.config.environment, now, policy: deps.config.policy }).filter(i => i.type === 'COVERAGE_INVITATION' || mutation?.kind === 'EXPIRE' || mutation?.kind === 'ESCALATE' && i.purpose === 'SUMMARY');
                // Semantic need budgets survive cancellation/reoffer. Existing visible outcomes
                // are retained; invitation IDs are not a new campaign on a new request ID.
                for (const intent of intents) {
                    if (intent.type === 'COVERAGE_INVITATION') {
                        intent.eventKey = [intent.environment, 'COVERAGE_INVITATION', intent.employeeId, source.semanticNeedKey].join(':');
                        invitationIds.add(intent.id);
                    }
                    statements.push(...notificationIntentStatements([intent]));
                }
            }
            if (row.kind === 'CALLOUT' && mutation?.kind === 'ESCALATE' && l.source) {
                const t = l.source;
                const after = requestSnapshot('CALLOUT', { id: row.id, requestRevision: l.revision, shiftId: t.shiftId, employeeId: String(s.row.employee_id), employeeName: '', locationId: t.locationId, locationName: '', weekStart: t.weekStart, date: t.date, startTime: t.startTime, endTime: t.endTime, reasonCode: s.row.reason_code as import('./callouts').CalloutReasonCode, status: 'PENDING', createdAt: String(s.row.created_at) });
                statements.push(...cancelNotificationStatements({ kind: 'CALLOUT', id: row.id, version: `r:${l.revision - 1}` }));
                statements.push(...notificationIntentStatements(buildNotificationIntents({ after, recipients: s.recipients, environment: deps.config.environment, now, policy: deps.config.policy })));
            }
            const weeks = [...new Set(s.scheduling.ledger.flatMap(t => [t.weekStart, ...affectedWorkweeks(shiftPeriod(t))]))];
            try {
                const timeGuard: SqlStatement = { text: `SELECT (CASE WHEN $1::timestamptz IS NULL OR $2::boolean OR clock_timestamp()-$3::timestamptz+$4::timestamptz<$1::timestamptz THEN '1' ELSE 'maintenance_deadline_changed' END)::integer`, values: [effective.completionDeadline, mutation?.kind === 'EXPIRE', s.databaseObservedAt, now.toISOString()] };
                const results = await deps.executor.transaction([...generationMutationGuards(s.scheduling.source, weeks), timeGuard, ...statements, timeGuard]);
                report.expired += mutation?.kind === 'EXPIRE' ? 1 : 0;
                report.escalated += mutation?.kind === 'ESCALATE' ? 1 : 0;
                report.invited += results.flat().filter(row => row && typeof row === 'object' && 'id' in row && invitationIds.has(String(row.id))).length;
                finished = true;
                break;
            }
            catch (error) {
                const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
                if (!(code === '40001' || code === '40P01' || code === '55P03' || code === '22P02' && error instanceof Error && /generation_source_conflict|request_transition_conflict|maintenance_deadline_changed/.test(error.message)))
                    throw error;
                if (attempt === 2)
                    report.conflicts++;
            }
        }
        if (!finished)
            break;
        report.scanned++;
        report.nextCursor = row.cursor;
    }
    if (report.scanned === rows.length)
        report.nextCursor = null;
    return report;
}
