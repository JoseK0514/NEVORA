import {notificationOperationalRecipientSql} from './notification-operational-sql';
import {isOperationalReviewRecipient,operationalNotificationAllowed} from '../notifications/operational-access';
import {communicationDevelopmentAllowedSql,communicationRecipientAllowedSql} from '../communications/sql';
import {recipientAlertOn} from '../notifications/alert-choices';
import {checkPayrollNotice} from '../payroll/notices';
import {readShiftChangeMaintenanceSnapshot,maintenanceExchangeSource} from './shift-change-maintenance';
import {currentShiftTermsSql} from './shift-change-release';
import { getWorkspace } from './workspaces';
import type { Workspace } from '../domain';
import { businessDate } from '../business-time';
import { notificationPolicyFor, notificationBoundary, notificationShiftStart } from '../notifications/policy';
import { neonNotificationExecutor, personalProjections, readNotificationWeekState, type GuardedWeekState } from './notification-transactions';
import type { NotificationIntent, NotificationStateRepository, RecipientAccess, SourceKind, SourceSnapshot, ScheduleSourceSnapshot, SourceRef, SourceCheck, SqlExecutor } from '../notifications/types';
import type { UserRole, Position } from '../domain';
import { getTimeOffRequest } from './requests';
import { getExchange } from './exchanges';
import { getCallout } from './callouts';
import { requestSnapshot } from './request-notifications';
import { mapAvailabilityInputs } from './availability-inputs';
import { resolveAvailabilityWeek } from '../scheduling/availability';
import { buildAvailabilitySubmissionState } from '../assistance/availability-submission';
import { buildManagerActionItems, type ManagerActionItem } from '../assistance/manager-actions';
import { calculateScheduleHealth, type HealthCoverageWindow, type HealthLocation, type HealthEmployee } from '../scheduling/schedule-health';
import { addDays, weekDates, weekStartFor } from '../date-utils';
import { canAccessPublishedAssignment, destinationForSource, isReviewRole, isSelfServiceRecipient } from '../notifications/destinations';
import { nextRoutineTime } from '../notifications/policy';
import { buildAcknowledgementState } from '../assistance/acknowledgement-state';
export const notificationReadSql = {
    operationalRecipient:notificationOperationalRecipientSql,
    summarySeeds: (environment='$1', employee='$2', source='$3', version='$4') => `SELECT event_key,urgency FROM notifications WHERE environment=${environment} AND employee_id=${employee} AND source_kind='EXCHANGE' AND source_id=${source} AND source_version=${version} AND purpose='SUMMARY' AND push_state='materialized' AND cancelled_at IS NULL`,
    coverageLocations: () => `SELECT l.id,l.short_name AS name,s.minimum_staff_per_shift AS "minimumStaffPerShift",s.requires_designated_lead AS "requiresDesignatedLead" FROM locations l LEFT JOIN location_staffing_settings s ON s.location_id=l.id WHERE l.active=true`,
    coverageWindows: () => `SELECT location_id AS "locationId",day_of_week AS "dayOfWeek",left(start_time::text,5) AS "startTime",left(end_time::text,5) AS "endTime",minimum_staff AS "minimumStaff", COALESCE((SELECT jsonb_agg(jsonb_build_object('positionId',r.position_id,'quantity',r.quantity)) FROM coverage_window_position_requirements r WHERE r.coverage_window_id=location_coverage_windows.id),'[]'::jsonb) AS "positionRequirements" FROM location_coverage_windows`,
    coverageEmployees: () => `SELECT e.id,e.first_name AS name,e.role,e.active,ARRAY(SELECT location_id FROM employee_location_eligibility WHERE employee_id=e.id) AS "eligibleLocationIds",ARRAY(SELECT ep.position_id FROM employee_positions ep JOIN positions p ON p.id=ep.position_id WHERE ep.employee_id=e.id AND p.active=true) AS "positionIds" FROM employees e`,
    coveragePositions: () => `SELECT id,workspace_id AS "workspaceId",name,active,created_at::text AS "createdAt",updated_at::text AS "updatedAt" FROM positions`,
    communication: (id='$1') => `SELECT r.id::text AS version,to_jsonb(r.published_at) AS updated_at,to_jsonb(r.expires_at) AS expires_at,
      ARRAY(SELECT candidate.id FROM employees candidate WHERE ${communicationRecipientAllowedSql('candidate.id')} ORDER BY candidate.id) AS recipient_ids
      FROM communications c JOIN communication_revisions r ON r.id=c.head_revision_id JOIN workspaces w ON w.id=c.workspace_id AND w.singleton AND w.active
      WHERE c.id::text=${id} AND c.state='PUBLISHED' AND (r.expires_at IS NULL OR r.expires_at>clock_timestamp()) AND ${communicationDevelopmentAllowedSql()}`, 
    intent: (id='$1') => `SELECT * FROM notifications WHERE id = ${id} AND environment IS NOT NULL AND cancelled_at IS NULL LIMIT 1`,
    recipient: (id='$1') => `SELECT e.id, e.role, e.active,COALESCE(to_jsonb(e)->'management_alert_choices','{}'::jsonb) AS alert_choices,
        COALESCE(array_agg(elig.location_id ORDER BY elig.location_id) FILTER (WHERE elig.location_id IS NOT NULL AND l.active=true), ARRAY[]::text[]) AS allowed_location_ids
        FROM employees e LEFT JOIN employee_location_eligibility elig ON elig.employee_id = e.id LEFT JOIN locations l ON l.id=elig.location_id
        WHERE e.id = ${id} GROUP BY e.id, e.role, e.active`,
    exchangeTerms: (id='$1') => `SELECT x.id FROM shift_exchanges x
                      JOIN shifts sh ON sh.id=x.source_shift_id JOIN schedules s ON s.id=sh.schedule_id
                      JOIN locations l ON l.id=s.location_id AND l.active=true
                      JOIN employee_location_eligibility elig ON elig.employee_id=x.requested_by_employee_id AND elig.location_id=l.id
                      LEFT JOIN shifts target ON target.id=x.target_shift_id LEFT JOIN schedules ts ON ts.id=target.schedule_id
                      WHERE x.id=${id} AND (x.legacy_manual OR (x.source_terms=${currentShiftTermsSql()} AND (x.target_shift_id IS NULL OR x.target_terms=${currentShiftTermsSql('target','ts')}))) AND s.status='PUBLISHED' AND sh.employee_id=x.requested_by_employee_id
                        AND (x.target_shift_id IS NULL OR (ts.status='PUBLISHED' AND target.employee_id=x.target_employee_id AND EXISTS(SELECT 1 FROM locations tl JOIN employee_location_eligibility te ON te.location_id=tl.id WHERE tl.id=ts.location_id AND tl.active=true AND te.employee_id=x.target_employee_id)))`,
    calloutTerms: (id='$1') => `SELECT c.id FROM shift_callouts c JOIN shifts sh ON sh.id=c.shift_id JOIN schedules s ON s.id=sh.schedule_id JOIN locations l ON l.id=s.location_id AND l.active=true JOIN employee_location_eligibility elig ON elig.employee_id=c.employee_id AND elig.location_id=l.id WHERE c.id=${id} AND (c.legacy_manual OR c.source_terms=${currentShiftTermsSql()}) AND s.status='PUBLISHED' AND sh.employee_id=c.employee_id`,
    selfTest: (id='$1',version='$2') => `SELECT employee_id, expires_at FROM push_subscriptions WHERE id=${id} AND generation=${version} AND status='active'`,
    locations: (ids='$1') => `SELECT id FROM locations WHERE id=ANY(${ids}::text[]) AND active=true`,
    availability: (week='$1') => `SELECT availability_deadline::text AS deadline,updated_at::text,
      (SELECT COALESCE(jsonb_agg(jsonb_build_object('employeeId',id,'employeeName',first_name || ' ' || last_name) ORDER BY id),'[]') FROM employees WHERE active=true AND role IN ('EMPLOYEE','LEAD')) AS employees,
      (SELECT COALESCE(jsonb_agg(w ORDER BY to_jsonb(w)),'[]') FROM availability_windows w) AS normal,
      (SELECT COALESCE(jsonb_agg(w ORDER BY to_jsonb(w)),'[]') FROM weekly_availability_windows w WHERE week_start=${week}) AS weekly,
      (SELECT COALESCE(jsonb_agg(s ORDER BY to_jsonb(s)),'[]') FROM weekly_availability_submissions s WHERE week_start=${week}) AS submissions,
      (SELECT COALESCE(jsonb_agg(e ORDER BY to_jsonb(e)),'[]') FROM availability_exceptions e WHERE date >= ${week}::date AND date < ${week}::date + 7) AS exceptions
      FROM schedule_week_settings WHERE week_start=${week}`,
};

const SOURCE_KINDS: readonly SourceKind[] = ['SCHEDULE', 'TIME_OFF', 'EXCHANGE', 'CALLOUT', 'AVAILABILITY', 'MANAGER_SUMMARY', 'SELF_TEST', 'COMMUNICATION', 'PAYROLL_PREPARATION', 'PAYROLL_STATEMENT'];
function instant(value: unknown): string | null {
    const time = value instanceof Date ? value.getTime() : Date.parse(String(value));
    return Number.isFinite(time) ? new Date(time).toISOString() : null;
}
/** Reads current business records. No copied notification payload is source truth. */
export function sqlNotificationStateRepository(executor: SqlExecutor = neonNotificationExecutor(), workspace?: Workspace): NotificationStateRepository {
    const repository: NotificationStateRepository = {
        async findIntent(notificationId) {
            const [row] = await executor.query<Record<string, unknown>>({ text: notificationReadSql.intent(), values: [notificationId] });
            if (!row || (row.environment !== 'test' && row.environment !== 'production') || !SOURCE_KINDS.includes(row.source_kind as SourceKind))
                return null;
            const dueAt = instant(row.due_at), expiresAt = instant(row.expires_at);
            if (!dueAt || !expiresAt || !['EVENT', 'REMINDER', 'SUMMARY', 'TEST'].includes(String(row.purpose)) || !['normal', 'high'].includes(String(row.urgency)))
                return null;
            return { id: String(row.id), employeeId: String(row.employee_id), type: String(row.type), title: String(row.title), body: String(row.body), actionHref: row.action_href ? String(row.action_href) : undefined, eventKey: String(row.event_key), environment: row.environment,
                source: { kind: row.source_kind as SourceKind, id: String(row.source_id), version: String(row.source_version) }, effectiveVersion: String(row.effective_version), purpose: row.purpose as NotificationIntent['purpose'], urgency: row.urgency as NotificationIntent['urgency'], dueAt, expiresAt, itemKeys: Array.isArray(row.item_keys) && row.item_keys.every(item => typeof item === 'string') ? row.item_keys : undefined };
        },
        async recipientAccess(employeeId,domain) {
            const [row] = await executor.query<{
                id: string;
                role: UserRole;
                active: boolean;
                alert_choices?: Record<string,boolean>;
                allowed_location_ids: string[];
            }>({ text: notificationReadSql.recipient(), values: [employeeId] });
            if (!row || !['OWNER', 'MANAGER', 'LEAD', 'EMPLOYEE'].includes(row.role))
                return null;
            const base:RecipientAccess={employeeId:row.id,role:row.role,active:row.active,allowedLocationIds:row.allowed_location_ids,...(row.alert_choices?{alertChoices:row.alert_choices}:{})};
            if(domain!=='operational'||!isOperationalReviewRecipient(base))return base;
            const [access]=await executor.query<{id:string;role:UserRole;active:boolean;company:boolean;authority:string}>({text:notificationReadSql.operationalRecipient(),values:[employeeId]});
            return {...base,operationalCompany:!!access?.company&&access.id===base.employeeId&&access.role===base.role&&access.active,operationalAuthority:access?.authority};
        },
        async readSource(source) {
            if(source.kind==='PAYROLL_PREPARATION'||source.kind==='PAYROLL_STATEMENT')return null; // Payroll checks use metadata-only authority queries.
            if (source.kind === 'TIME_OFF') {
                const record = await getTimeOffRequest(source.id, executor);
                return record ? requestSnapshot('TIME_OFF', record) : null;
            }
            if (source.kind === 'EXCHANGE') {
                const record = await getExchange(source.id, executor);
                if (!record) return null;
                if (['OPEN','EMPLOYEE_PENDING','MANAGER_PENDING'].includes(record.status)) {
                    const zone=(workspace ?? await getWorkspace(executor)).timeZone;
                    if(!Number.isFinite(notificationShiftStart(record.sourceShift,zone)) || (record.targetShift && !Number.isFinite(notificationShiftStart(record.targetShift,zone)))) return null;
                    const [valid] = await executor.query({text: notificationReadSql.exchangeTerms(),values:[source.id]});
                    if (!valid) return null;
                }
                const current=await readShiftChangeMaintenanceSnapshot(source.id,'EXCHANGE',executor);
                const snapshot=current?.lifecycle.source ? maintenanceExchangeSource(current,record) : requestSnapshot('EXCHANGE',record);
                if(source.version.startsWith('coverage-need:')) {
                    if(snapshot.kind!=='EXCHANGE' || snapshot.record.status!=='OPEN' || ![summarySourceRef(snapshot,'normal').version,summarySourceRef(snapshot,'high').version].includes(source.version))return null;
                    snapshot.source.version=source.version;
                }
                // Pre-upgrade status events cannot revive later same-status revisions.
                if(!source.version.startsWith('r:') && source.version===record.status && (record.requestRevision??1)===1)snapshot.source.version=source.version;
                return snapshot;
            }
            if (source.kind === 'CALLOUT') {
                const record = await getCallout(source.id, executor);
                if (!record) return null;
                if (record.status === 'PENDING') {
                    if(!Number.isFinite(notificationShiftStart(record,(workspace ?? await getWorkspace(executor)).timeZone))) return null;
                    const [valid] = await executor.query({text: notificationReadSql.calloutTerms(),values:[source.id]});
                    if (!valid) return null;
                }
                const snapshot=requestSnapshot('CALLOUT',record);
                if(!source.version.startsWith('r:') && source.version===record.status && (record.requestRevision??1)===1)snapshot.source.version=source.version;
                return snapshot;
            }
            if (source.kind === 'SCHEDULE') {
                const state = await readNotificationWeekState([source.id], executor);
                return scheduleSourceSnapshot(state,source.id);
            }
            if (source.kind === 'AVAILABILITY') return readAvailabilitySource(source.id, executor);
            if (source.kind === 'MANAGER_SUMMARY') {
                // A week id is a configured coverage candidate; deliverable groups use a persisted UUID.
                if (/^\d{4}-\d{2}-\d{2}$/.test(source.id)) return readCoverageSource(source.id,executor,(workspace ?? await getWorkspace(executor)).timeZone);
                const intent = await repository.findIntent(source.id);
                if (!intent || intent.source.kind !== 'MANAGER_SUMMARY' || intent.source.version !== source.version) return null;
                const items: ManagerActionItem[] = [];
                const recipient=await repository.recipientAccess(intent.employeeId);
                for (const key of intent.itemKeys ?? []) {
                    const member = parseSummaryMember(key);
                    if (!member) continue;
                    if(!recipientAlertOn(recipient,member.source.kind))continue;
                    const current = await repository.readSource(member.source);
                    if (!current) continue;
                    if (current.kind !== 'MANAGER_SUMMARY' && current.source.version !== member.source.version) {
                        // Compatibility for already queued revision-keyed coverage groups:
                        // only their own consumed semantic seed can prove the unchanged need.
                        if(current.kind!=='EXCHANGE' || current.record.status!=='OPEN' || !current.semanticNeedKey)continue;
                        const seeds=await executor.query<{event_key:string;urgency:NotificationIntent['urgency']}>({text:notificationReadSql.summarySeeds(),values:[intent.environment,intent.employeeId,member.source.id,member.source.version]});
                        if(!seeds.some(seed=>isCurrentCoverageAttentionSeed({...intent,source:member.source,effectiveVersion:member.source.version,eventKey:seed.event_key,urgency:seed.urgency},current)))continue;
                    }
                    items.push(...summarySourceItems(current).filter(item=>item.id===member.itemId));
                }
                return {kind:'MANAGER_SUMMARY',source:{...source,kind:'MANAGER_SUMMARY'},updatedAt:intent.dueAt,weekStart:'',items,expiresAt:intent.expiresAt};
            }
            if (source.kind === 'COMMUNICATION') {
                const [row]=await executor.query<{version:string;updated_at:string;expires_at:string|null;recipient_ids:string[]}>({text:notificationReadSql.communication(),values:[source.id]});
                return row && Array.isArray(row.recipient_ids) ? {kind:'COMMUNICATION',source:{kind:'COMMUNICATION',id:source.id,version:row.version},updatedAt:row.updated_at,expiresAt:row.expires_at,recipientIds:row.recipient_ids} : null;
            }
            const [row] = await executor.query<{employee_id:string;expires_at:string}>({text:notificationReadSql.selfTest(),values:[source.id,source.version]});
            return row ? {kind:'SELF_TEST',source:{...source,kind:'SELF_TEST'},updatedAt:'',employeeId:row.employee_id,expiresAt:row.expires_at ? instant(row.expires_at)! : '9999-01-01T00:00:00.000Z'} : null;
        },
        async check(intent, recipientId, now, use = 'delivery') {
            if (intent.employeeId !== recipientId) return rejected(intent,'recipient_mismatch');
            if(intent.source.kind==='PAYROLL_PREPARATION'||intent.source.kind==='PAYROLL_STATEMENT')return checkPayrollNotice(intent,recipientId,now,executor,workspace);
            let recipient=await repository.recipientAccess(recipientId);
            if(!recipientAlertOn(recipient,intent.source.kind,intent.type))return rejected(intent,'topic_disabled');
            const operational=intent.source.kind!=='SELF_TEST'&&(!!recipient&&isOperationalReviewRecipient(recipient)||intent.purpose==='SUMMARY'||intent.source.kind==='MANAGER_SUMMARY');
            if(operational){const originalRole=recipient?.role;recipient=await repository.recipientAccess(recipientId,'operational');if(!recipient?.active||recipient.role!==originalRole||!isOperationalReviewRecipient(recipient)||recipient.operationalCompany!==true||!recipient.operationalAuthority)return rejected(intent,'operational_access_lost');}
            const admitted=recipient;
            const response=async(result:SourceCheck)=>{
                if(!result.deliverable||intent.source.kind==='SELF_TEST')return result;
                const current=await repository.recipientAccess(recipientId,operational?'operational':undefined);
                // A successful own-source read keeps its original identity/role;
                // promotion cannot inherit the earlier self-service admission.
                if(!current?.active||current.employeeId!==admitted?.employeeId||current.role!==admitted?.role)return rejected(intent,'operational_access_lost');
                return !operational||current.operationalCompany===true&&current.operationalAuthority===admitted?.operationalAuthority?result:rejected(intent,'operational_access_lost');
            };
            let source=await repository.readSource(intent.source);
            if(source?.kind==='EXCHANGE' && source.record.status==='OPEN'){const current=await readShiftChangeMaintenanceSnapshot(intent.source.id,'EXCHANGE',executor,now);if(current?.lifecycle.source)source=maintenanceExchangeSource(current,source.record);}
            try {
                const current=await getWorkspace(executor);
                if (workspace && (current.id!==workspace.id || current.timeZone!==workspace.timeZone || current.updatedAt!==workspace.updatedAt)) return rejected(intent,'workspace_changed');
                if (use==='open') {
                    const history=checkParticipantHistory(intent,recipient,source,now);
                    if (history) return await response(history);
                }
                const locationIds=source?.kind==='EXCHANGE' ? [source.record.sourceShift.locationId,...(source.record.targetShift ? [source.record.targetShift.locationId] : [])]
                    : source?.kind==='CALLOUT' ? [source.record.locationId]
                    : source?.kind==='SCHEDULE' && recipient ? [...source.previousShifts,...source.currentShifts].filter(s=>canAccessPublishedAssignment(recipient,s)).map(s=>s.locationId) : [];
                if(locationIds.length) {
                    const active=await executor.query<{id:string}>({text:notificationReadSql.locations(),values:[[...new Set(locationIds)]]});
                    if(locationIds.some(id=>!active.some(l=>l.id===id))) return rejected(intent,'location_inactive');
                }
                return await response(evaluateNotificationSource(intent, recipient, source, now,notificationPolicyFor(current.timeZone)));
            } catch {return rejected(intent,'workspace_unavailable');}
        },
        async listReminderCandidates(now, limit, shouldContinue = () => true, visit) {
            if (!shouldContinue()) return [];
            const bounded = Math.max(1,Math.min(100,Math.floor(limit) || 10));
            const currentWeek = weekStartFor(businessDate(now,(workspace ?? await getWorkspace(executor)).timeZone));
            const rows = await executor.query<{kind:'SCHEDULE'|'AVAILABILITY'|'MANAGER_SUMMARY';id:string}>({text:`SELECT kind,id FROM (
              SELECT 'AVAILABILITY' AS kind,week_start::text AS id FROM schedule_week_settings
                WHERE availability_deadline IS NOT NULL AND availability_deadline > $1::timestamptz - interval '72 hours'
                  AND week_start BETWEEN $2::date - 7 AND $2::date + 28
              UNION SELECT 'SCHEDULE',week_start::text FROM schedule_publication_revisions WHERE week_start BETWEEN $2::date AND $2::date + 28
              UNION SELECT 'MANAGER_SUMMARY',week_start::text FROM schedules WHERE week_start BETWEEN $2::date AND $2::date + 28
            ) candidates ORDER BY id,kind LIMIT $3`,values:[now.toISOString(),currentWeek,bounded]});
            const result: SourceSnapshot[] = [];
            for (const row of rows) {
                if (!shouldContinue()) break;
                const source = await repository.readSource({...row,version:''});
                if (source && shouldContinue()) {
                    if (visit) await visit(source); else result.push(source);
                }
            }
            return result;
        },
    };
    return repository;
}

function rejected(intent: NotificationIntent, reason: string): SourceCheck {
    return {deliverable:false,reason,effectiveVersion:intent.effectiveVersion,expiresAt:intent.expiresAt};
}

/** Opening a terminal outcome preserves the current participant's history access.
 * Delivery still uses all operational restrictions below; payload links grant no access. */
function checkParticipantHistory(intent: NotificationIntent, recipient: RecipientAccess | null, source: SourceSnapshot | null, now: Date): SourceCheck | null {
    if (!source || (source.kind!=='EXCHANGE' && source.kind!=='CALLOUT') || !['APPROVED','DENIED','CANCELLED','EXPIRED'].includes(source.record.status)) return null;
    const participant=source.kind==='CALLOUT' ? source.record.employeeId===recipient?.employeeId
        : source.record.requestedByEmployeeId===recipient?.employeeId || source.record.targetEmployeeId===recipient?.employeeId;
    if (!participant) return null;
    if (!recipient?.active || recipient.employeeId!==intent.employeeId || intent.purpose!=='EVENT') return rejected(intent,'history_access_lost');
    if (source.kind!==intent.source.kind || source.source.kind!==intent.source.kind || source.source.id!==intent.source.id || source.source.version!==intent.source.version || source.source.version!==intent.effectiveVersion) return rejected(intent,'source_superseded');
    const expiry=Date.parse(intent.expiresAt);
    if (!Number.isFinite(expiry) || expiry<=now.getTime()) return rejected(intent,'expired');
    const destination=destinationForSource(source,recipient);
    return destination ? {deliverable:true,reason:'participant_history',effectiveVersion:source.source.version,expiresAt:new Date(expiry).toISOString(),destination} : rejected(intent,'history_access_lost');
}

/**
 * Re-evaluate an intent against current canonical business facts and recipient
 * access; its copied title/body never grants delivery authority. Personal
 * publication versions and semantic invitation campaigns may differ from the
 * newest global revision. Persisted expiry remains an upper bound, and routine
 * delivery must still fit before expiry after the next allowed routine time.
 */
export function evaluateNotificationSource(intent: NotificationIntent, recipient: RecipientAccess | null, source: SourceSnapshot | null, now: Date, policy: import('../notifications/types').NotificationPolicy): SourceCheck {
    const shiftStart = (shift:{date:string;startTime:string;endTime:string}) => notificationShiftStart(shift,policy.timeZone);
    if (!recipient?.active || recipient.employeeId!==intent.employeeId || !source) return rejected(intent,'source_or_access_lost');
    if(!operationalNotificationAllowed(source.kind,recipient))return rejected(intent,'operational_access_lost');
    if (source.kind!==intent.source.kind || source.source.id!==intent.source.id) return rejected(intent,'source_mismatch');
    let expiry = Date.parse(intent.expiresAt);
    let effectiveVersion = source.source.version;
    if (source.kind==='SCHEDULE') {
        if ([...source.previousShifts,...source.currentShifts].filter(s=>canAccessPublishedAssignment(recipient,s)).some(s=>!Number.isFinite(shiftStart(s)))) return rejected(intent,'invalid_source_boundary');
        const projection = source.employeePublications?.[recipient.employeeId];
        if (!projection) return rejected(intent,'publication_missing');
        effectiveVersion = projection.effectiveVersion;
        if (intent.purpose==='REMINDER') {
            const personal = source.currentShifts.filter(s=>canAccessPublishedAssignment(recipient,s));
            const acknowledgement = buildAcknowledgementState({employeeId:recipient.employeeId,latestRevisionId:source.revision.id,acknowledgementRevisionId:projection.acknowledgement?.acknowledgedRevisionId,
                acknowledgedRevisionShifts:projection.acknowledgedRevisionShifts?.filter(s=>canAccessPublishedAssignment(recipient,s)),latestRevisionShifts:personal});
            const nextShift = Math.min(...personal.filter(s=>!s.isCalloutApproved && shiftStart(s)>now.getTime()).map(shiftStart));
            if (!isSelfServiceRecipient(recipient) || !acknowledgement.needsAcknowledgement || !Number.isFinite(nextShift)) return rejected(intent,'acknowledgement_resolved');
            expiry = Math.min(expiry,nextShift,Date.parse(projection.publishedAt)+7*86400000,notificationBoundary(`${addDays(source.revision.weekStart,7)}T00:00`,policy.timeZone));
        }
    } else if (source.kind==='AVAILABILITY') {
        const deadline = Date.parse(source.settings.availabilityDeadline ?? '');
        if (intent.purpose!=='REMINDER' || !isSelfServiceRecipient(recipient) || source.submissions.some(s=>s.employeeId===recipient.employeeId && s.submitted)) return rejected(intent,'availability_resolved');
        expiry = Math.min(expiry,deadline);
    } else if (source.kind==='MANAGER_SUMMARY') {
        if (!isReviewRole(recipient) || !source.items.length) return rejected(intent,'summary_resolved');
        const coverage = source.items.filter(i=>i.type==='COVERAGE_GAP').map(i=>notificationBoundary(i.dateTime ?? '',policy.timeZone));
        if (intent.urgency==='high' && !coverage.some(start=>start>now.getTime() && start-now.getTime()<=12*3600000)) return rejected(intent,'urgent_source_resolved');
        expiry = Math.min(expiry,Date.parse(source.expiresAt),...coverage);
    } else if (source.kind==='COMMUNICATION') {
        if(intent.environment!=='test' || intent.type!=='COMMUNICATION' || intent.purpose!=='EVENT' || source.source.version!==intent.source.version || !isSelfServiceRecipient(recipient) || !source.recipientIds.includes(recipient.employeeId)) return rejected(intent,'communication_access_lost');
        if(source.expiresAt)expiry=Math.min(expiry,Date.parse(source.expiresAt));
    } else if (source.kind==='SELF_TEST') {
        if (intent.purpose!=='TEST' || source.employeeId!==recipient.employeeId) return rejected(intent,'test_access_lost');
        expiry = Math.min(expiry,Date.parse(source.expiresAt));
    } else {
        if (intent.purpose==='SUMMARY') return rejected(intent,'collection_seed');
        const record = source.record;
        if(source.kind==='CALLOUT' && !Number.isFinite(shiftStart(source.record))) return rejected(intent,'invalid_source_boundary');
        if (source.kind==='CALLOUT' && !recipient.allowedLocationIds.includes(source.record.locationId) && !isReviewRole(recipient)) return rejected(intent,'operational_access_lost');
        if (source.kind==='EXCHANGE' && !recipient.allowedLocationIds.includes(source.record.sourceShift.locationId) && !isReviewRole(recipient)) return rejected(intent,'operational_access_lost');
        const invitation=source.kind==='EXCHANGE' && record.status==='OPEN' && intent.type==='COVERAGE_INVITATION' && source.eligibleEmployeeIds?.includes(recipient.employeeId) && isSelfServiceRecipient(recipient);
        if(invitation && /^r:[1-9][0-9]*$/.test(intent.effectiveVersion) && /^r:[1-9][0-9]*$/.test(source.source.version) && Number(intent.effectiveVersion.slice(2))<=Number(source.source.version.slice(2)))effectiveVersion=intent.effectiveVersion;
        const terminal=source.kind==='EXCHANGE' && ['CANCELLED','EXPIRED'].includes(record.status) && intent.type===`${source.record.kind}_${record.status}` && [source.record.requestedByEmployeeId,source.record.targetEmployeeId].includes(recipient.employeeId);
        if (['CANCELLED','EXPIRED','PENDING','OPEN','MANAGER_PENDING'].includes(record.status) && !invitation && !terminal) return rejected(intent,'request_resolved_or_seed');
        if (source.kind==='EXCHANGE') {
            if (source.record.status==='EMPLOYEE_PENDING' && source.record.targetEmployeeId!==recipient.employeeId) return rejected(intent,'not_response_target');
            if (!isReviewRole(recipient) && source.record.targetShift && !recipient.allowedLocationIds.includes(source.record.targetShift.locationId)) return rejected(intent,'target_access_lost');
            if(!terminal)expiry = Math.min(expiry,source.completionDeadline?Date.parse(source.completionDeadline):Infinity,shiftStart(source.record.sourceShift),source.record.targetShift ? shiftStart(source.record.targetShift) : Infinity);
        }
    }
    if (effectiveVersion!==intent.effectiveVersion) return rejected(intent,'source_superseded');
    const destination = destinationForSource(source,recipient);
    if (!destination) return rejected(intent,'access_lost');
    const allowedTime = intent.urgency==='high' ? now : nextRoutineTime(now,policy);
    if (!Number.isFinite(expiry) || expiry<=allowedTime.getTime()) return rejected(intent,'expired');
    return {deliverable:true,reason:'current',effectiveVersion,expiresAt:new Date(expiry).toISOString(),destination};
}

/** Coverage attention consumes one semantic campaign despite same-state escalation revisions.
 * This is only for manager collection; employee commands/events retain revision checks. */
export function summarySourceRef(source: SourceSnapshot, urgency: NotificationIntent['urgency'] = 'normal'): SourceRef {
    return source.kind==='EXCHANGE' && source.record.status==='OPEN' && source.semanticNeedKey
        ? {...source.source,version:`coverage-need:${urgency}:${source.semanticNeedKey}`} : source.source;
}
export function isCurrentCoverageAttentionSeed(intent: NotificationIntent, source: SourceSnapshot): boolean {
    return source.kind==='EXCHANGE' && source.record.status==='OPEN' && !!source.semanticNeedKey
        && intent.source.kind==='EXCHANGE' && intent.source.id===source.source.id && intent.purpose==='SUMMARY'
        && /^r:[1-9][0-9]*$/.test(intent.effectiveVersion) && /^r:[1-9][0-9]*$/.test(source.source.version)
        && Number(intent.effectiveVersion.slice(2))<=Number(source.source.version.slice(2))
        && intent.eventKey===[intent.environment,'COVERAGE_ATTENTION',intent.employeeId,source.semanticNeedKey,intent.urgency==='high'?'URGENT':'ROUTINE'].join(':');
}

/** Existing item_keys carry source references and item/day consumption; no new ledger. */
export type SummaryMember = {source: SourceRef;itemId:string;budget:string};
export function summaryMemberKey(member: SummaryMember): string { return JSON.stringify([member.source.kind,member.source.id,member.source.version,member.itemId,member.budget]); }
export function parseSummaryMember(key: string): SummaryMember | null {
    try {
        const parts: unknown = JSON.parse(key);
        if (!Array.isArray(parts) || parts.length!==5 || !parts.every(p=>typeof p==='string') || !['TIME_OFF','EXCHANGE','CALLOUT','AVAILABILITY','MANAGER_SUMMARY'].includes(parts[0])) return null;
        if (parts[0]==='MANAGER_SUMMARY' && !/^\d{4}-\d{2}-\d{2}$/.test(parts[1])) return null;
        return {source:{kind:parts[0] as SourceKind,id:parts[1],version:parts[2]},itemId:parts[3],budget:parts[4]};
    } catch { return null; }
}
/** Policy-relevant manager work only; setup/hour/acknowledgement nags excluded. */
export function summarySourceItems(source: SourceSnapshot): ManagerActionItem[] {
    if (source.kind==='MANAGER_SUMMARY') return source.items.filter(i=>i.type==='COVERAGE_GAP');
    if (source.kind==='AVAILABILITY') {
        if (!source.settings.availabilityDeadline || !source.submissions.some(s=>!s.submitted)) return [];
        return [{id:`AVAILABILITY:${source.source.version}`,type:'AVAILABILITY_MISSING',priority:'MISSING_INPUT',title:'Availability review',detail:'Review availability not sent yet.',href:`/app/availability?week=${source.settings.weekStart}`}];
    }
    if (source.kind==='TIME_OFF' || source.kind==='CALLOUT' || source.kind==='EXCHANGE') {
        if (!(source.kind==='EXCHANGE' ? ['OPEN','MANAGER_PENDING'] : ['PENDING']).includes(source.record.status)) return [];
        const items = buildManagerActionItems({weekStart:'',availabilityDeadlineSet:true,coverageRulesConfigured:true,pendingRequests:[{id:source.source.id,kind:source.kind,employeeName:'',createdAt:source.record.createdAt}]});
        if (source.kind==='EXCHANGE' && source.record.status==='OPEN') return items.map(i=>({...i,type:'COVERAGE_GAP',href:`/app/exchange?tab=coverage&requestId=${encodeURIComponent(source.source.id)}`,dateTime:`${source.record.sourceShift.date}T${source.record.sourceShift.startTime.slice(0,5)}`}));
        return items;
    }
    return [];
}

async function readAvailabilitySource(week: string, executor: SqlExecutor): Promise<SourceSnapshot | null> {
    const [row] = await executor.query<{deadline:string|null;updated_at:string;employees:{employeeId:string;employeeName:string}[];normal:Record<string,unknown>[];weekly:Record<string,unknown>[];submissions:Record<string,unknown>[];exceptions:Record<string,unknown>[]}>({text:notificationReadSql.availability(),values:[week]});
    if (!row?.deadline) return null;
    const deadline = instant(row.deadline);
    if (!deadline) return null;
    return {kind:'AVAILABILITY',source:{kind:'AVAILABILITY',id:week,version:deadline},updatedAt:row.updated_at,settings:{weekStart:week,availabilityDeadline:deadline},submissions:row.employees.map(employee=>{
        const own = (rows: Record<string,unknown>[]) => rows.filter(r=>r.employee_id===employee.employeeId);
        const marker = own(row.submissions).find(s=>Boolean(s.submitted_at));
        const inputs = mapAvailabilityInputs(own(row.normal),own(row.weekly),own(row.submissions),own(row.exceptions),week,week);
        const windowCount = resolveAvailabilityWeek({weekStart:week,...inputs}).length;
        return {...employee,...buildAvailabilitySubmissionState({submitted:Boolean(marker),windowCount,deadlinePassed:false}),windowCount,submittedAt:marker ? instant(marker.submitted_at) ?? undefined : undefined};
    })};
}
async function readCoverageSource(week: string, executor: SqlExecutor,timeZone:string): Promise<SourceSnapshot> {
    const [state,locations,coverageWindows,employees,positions] = await Promise.all([
        readNotificationWeekState([addDays(week,-7),week],executor),
        executor.query<HealthLocation>({text:notificationReadSql.coverageLocations(),values:[]}),
        executor.query<HealthCoverageWindow>({text:notificationReadSql.coverageWindows(),values:[]}),
        executor.query<HealthEmployee>({text:notificationReadSql.coverageEmployees(),values:[]}),
        executor.query<Position>({text:notificationReadSql.coveragePositions(),values:[]}),
    ]);
    const health = calculateScheduleHealth({locations,coverageWindows,positions,weekDates:weekDates(week),employees,
        shifts:state.shifts.filter(s=>!s.isCalloutApproved && state.schedules.some(schedule=>schedule.id===s.scheduleId && schedule.status!=='ARCHIVED')).map(s=>({...s,positionId:s.positionId || undefined,id:s.sourceShiftId}))});
    // Health supports existing-shift fallback for its UI. Notifications require an actual configured window.
    const coverageGaps = health.coverageBlocks.filter(b=>!b.covered && coverageWindows.some(w=>w.locationId===b.locationId && w.dayOfWeek===new Date(`${b.date}T12:00:00Z`).getUTCDay() && w.startTime<b.endTime && w.endTime>b.startTime)).map(b=>({...b,requiresLead:!b.leadCovered}));
    return {kind:'MANAGER_SUMMARY',source:{kind:'MANAGER_SUMMARY',id:week,version:'configured'},updatedAt:'',weekStart:week,
        items:buildManagerActionItems({weekStart:week,coverageGaps,availabilityDeadlineSet:true,coverageRulesConfigured:true}),expiresAt:new Date(notificationBoundary(`${addDays(week,7)}T00:00`,timeZone)).toISOString()};
}

export function scheduleSourceSnapshot(state: GuardedWeekState, week: string): ScheduleSourceSnapshot | null {
    const history = state.revisions.filter(r=>r.weekStart===week);
    const latest = history.at(-1);
    return latest ? {kind:'SCHEDULE',source:{kind:'SCHEDULE',id:week,version:latest.id},updatedAt:latest.createdAt,revision:latest,
        previousShifts:history.flatMap(r=>r.shifts),currentShifts:latest.shifts,employeePublications:personalProjections(state,week)} : null;
}
