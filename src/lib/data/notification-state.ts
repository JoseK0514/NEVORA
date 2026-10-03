import { neonNotificationExecutor, personalProjections, readNotificationWeekState, type GuardedWeekState } from './notification-transactions';
import type { NotificationIntent, NotificationStateRepository, RecipientAccess, SourceKind, SourceSnapshot, ScheduleSourceSnapshot, SourceRef, SourceCheck, SqlExecutor } from '../notifications/types';
import type { UserRole } from '../domain';
import { getTimeOffRequest } from './requests';
import { getExchange } from './exchanges';
import { getCallout } from './callouts';
import { requestSnapshot } from './request-notifications';
import { mapAvailabilityInputs } from './availability-inputs';
import { resolveAvailabilityWeek } from '../scheduling/availability';
import { buildAvailabilitySubmissionState } from '../assistance/availability-submission';
import { buildManagerActionItems, type ManagerActionItem } from '../assistance/manager-actions';
import { calculateScheduleHealth, type HealthCoverageWindow, type HealthLocation } from '../scheduling/schedule-health';
import { addDays, weekDates, weekStartFor } from '../date-utils';
import { canAccessPublishedAssignment, destinationForSource, isReviewRole, isSelfServiceRecipient } from '../notifications/destinations';
import { DEFAULT_NOTIFICATION_POLICY, nextRoutineTime } from '../notifications/policy';
import { buildAcknowledgementState } from '../assistance/acknowledgement-state';
const SOURCE_KINDS: readonly SourceKind[] = ['SCHEDULE', 'TIME_OFF', 'EXCHANGE', 'CALLOUT', 'AVAILABILITY', 'MANAGER_SUMMARY', 'SELF_TEST'];
function instant(value: unknown): string | null {
    const time = value instanceof Date ? value.getTime() : Date.parse(String(value));
    return Number.isFinite(time) ? new Date(time).toISOString() : null;
}
/** Reads current business records. No copied notification payload is source truth. */
export function sqlNotificationStateRepository(executor: SqlExecutor = neonNotificationExecutor()): NotificationStateRepository {
    const repository: NotificationStateRepository = {
        async findIntent(notificationId) {
            const [row] = await executor.query<Record<string, unknown>>({ text: `SELECT * FROM notifications WHERE id = $1 AND environment IS NOT NULL AND cancelled_at IS NULL LIMIT 1`, values: [notificationId] });
            if (!row || (row.environment !== 'test' && row.environment !== 'production') || !SOURCE_KINDS.includes(row.source_kind as SourceKind))
                return null;
            const dueAt = instant(row.due_at), expiresAt = instant(row.expires_at);
            if (!dueAt || !expiresAt || !['EVENT', 'REMINDER', 'SUMMARY', 'TEST'].includes(String(row.purpose)) || !['normal', 'high'].includes(String(row.urgency)))
                return null;
            return { id: String(row.id), employeeId: String(row.employee_id), type: String(row.type), title: String(row.title), body: String(row.body), actionHref: row.action_href ? String(row.action_href) : undefined, eventKey: String(row.event_key), environment: row.environment,
                source: { kind: row.source_kind as SourceKind, id: String(row.source_id), version: String(row.source_version) }, effectiveVersion: String(row.effective_version), purpose: row.purpose as NotificationIntent['purpose'], urgency: row.urgency as NotificationIntent['urgency'], dueAt, expiresAt, itemKeys: Array.isArray(row.item_keys) && row.item_keys.every(item => typeof item === 'string') ? row.item_keys : undefined };
        },
        async recipientAccess(employeeId) {
            const [row] = await executor.query<{
                id: string;
                role: UserRole;
                active: boolean;
                allowed_location_ids: string[];
            }>({ text: `SELECT e.id, e.role, e.active,
        COALESCE(array_agg(elig.location_id ORDER BY elig.location_id) FILTER (WHERE elig.location_id IS NOT NULL), ARRAY[]::text[]) AS allowed_location_ids
        FROM employees e LEFT JOIN employee_location_eligibility elig ON elig.employee_id = e.id
        WHERE e.id = $1 GROUP BY e.id, e.role, e.active`, values: [employeeId] });
            if (!row || !['OWNER', 'MANAGER', 'LEAD', 'EMPLOYEE'].includes(row.role))
                return null;
            return { employeeId: row.id, role: row.role, active: row.active, allowedLocationIds: row.allowed_location_ids } satisfies RecipientAccess;
        },
        async readSource(source) {
            if (source.kind === 'TIME_OFF') {
                const record = await getTimeOffRequest(source.id, executor);
                return record ? requestSnapshot('TIME_OFF', record) : null;
            }
            if (source.kind === 'EXCHANGE') {
                const record = await getExchange(source.id, executor);
                if (!record) return null;
                if (['OPEN','EMPLOYEE_PENDING','MANAGER_PENDING'].includes(record.status)) {
                    const [valid] = await executor.query({text: `SELECT x.id FROM shift_exchanges x
                      JOIN shifts sh ON sh.id=x.source_shift_id JOIN schedules s ON s.id=sh.schedule_id
                      LEFT JOIN shifts target ON target.id=x.target_shift_id LEFT JOIN schedules ts ON ts.id=target.schedule_id
                      WHERE x.id=$1 AND s.status='PUBLISHED' AND sh.employee_id=x.requested_by_employee_id
                        AND (x.target_shift_id IS NULL OR (ts.status='PUBLISHED' AND target.employee_id=x.target_employee_id))`,values:[source.id]});
                    if (!valid) return null;
                }
                return requestSnapshot('EXCHANGE', record);
            }
            if (source.kind === 'CALLOUT') {
                const record = await getCallout(source.id, executor);
                if (!record) return null;
                if (record.status === 'PENDING') {
                    const [valid] = await executor.query({text: `SELECT c.id FROM shift_callouts c JOIN shifts sh ON sh.id=c.shift_id JOIN schedules s ON s.id=sh.schedule_id WHERE c.id=$1 AND s.status='PUBLISHED' AND sh.employee_id=c.employee_id`,values:[source.id]});
                    if (!valid) return null;
                }
                return requestSnapshot('CALLOUT', record);
            }
            if (source.kind === 'SCHEDULE') {
                const state = await readNotificationWeekState([source.id], executor);
                return scheduleSourceSnapshot(state,source.id);
            }
            if (source.kind === 'AVAILABILITY') return readAvailabilitySource(source.id, executor);
            if (source.kind === 'MANAGER_SUMMARY') {
                // A week id is a configured coverage candidate; deliverable groups use a persisted UUID.
                if (/^\d{4}-\d{2}-\d{2}$/.test(source.id)) return readCoverageSource(source.id,executor);
                const intent = await repository.findIntent(source.id);
                if (!intent || intent.source.kind !== 'MANAGER_SUMMARY' || intent.source.version !== source.version) return null;
                const items: ManagerActionItem[] = [];
                for (const key of intent.itemKeys ?? []) {
                    const member = parseSummaryMember(key);
                    if (!member) continue;
                    const current = await repository.readSource(member.source);
                    if (!current || (current.kind !== 'MANAGER_SUMMARY' && current.source.version !== member.source.version)) continue;
                    items.push(...summarySourceItems(current).filter(item=>item.id===member.itemId));
                }
                return {kind:'MANAGER_SUMMARY',source:{...source,kind:'MANAGER_SUMMARY'},updatedAt:intent.dueAt,weekStart:'',items,expiresAt:intent.expiresAt};
            }
            const [row] = await executor.query<{employee_id:string;expires_at:string}>({text:`SELECT employee_id, expires_at FROM push_subscriptions WHERE id=$1 AND generation=$2 AND status='active'`,values:[source.id,source.version]});
            return row ? {kind:'SELF_TEST',source:{...source,kind:'SELF_TEST'},updatedAt:'',employeeId:row.employee_id,expiresAt:row.expires_at ? instant(row.expires_at)! : '9999-01-01T00:00:00.000Z'} : null;
        },
        async check(intent, recipientId, now) {
            if (intent.employeeId !== recipientId) return rejected(intent,'recipient_mismatch');
            const [recipient, source] = await Promise.all([repository.recipientAccess(recipientId),repository.readSource(intent.source)]);
            return evaluateNotificationSource(intent, recipient, source, now);
        },
        async listReminderCandidates(now, limit, shouldContinue = () => true, visit) {
            if (!shouldContinue()) return [];
            const bounded = Math.max(1,Math.min(100,Math.floor(limit) || 10));
            const currentWeek = weekStartFor(new Date(now.getTime()-4*3600000).toISOString().slice(0,10));
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
const shiftStart = (shift: {date:string;startTime:string}) => Date.parse(`${shift.date}T${shift.startTime.slice(0,5)}:00-04:00`);
/** Persisted lifetime is always an upper bound, including for request outcomes. */
export function evaluateNotificationSource(intent: NotificationIntent, recipient: RecipientAccess | null, source: SourceSnapshot | null, now: Date): SourceCheck {
    if (!recipient?.active || recipient.employeeId!==intent.employeeId || !source) return rejected(intent,'source_or_access_lost');
    if (source.kind!==intent.source.kind || source.source.id!==intent.source.id) return rejected(intent,'source_mismatch');
    let expiry = Date.parse(intent.expiresAt);
    let effectiveVersion = source.source.version;
    if (source.kind==='SCHEDULE') {
        const projection = source.employeePublications?.[recipient.employeeId];
        if (!projection) return rejected(intent,'publication_missing');
        effectiveVersion = projection.effectiveVersion;
        if (intent.purpose==='REMINDER') {
            const personal = source.currentShifts.filter(s=>canAccessPublishedAssignment(recipient,s));
            const acknowledgement = buildAcknowledgementState({employeeId:recipient.employeeId,latestRevisionId:source.revision.id,acknowledgementRevisionId:projection.acknowledgement?.acknowledgedRevisionId,
                acknowledgedRevisionShifts:projection.acknowledgedRevisionShifts?.filter(s=>canAccessPublishedAssignment(recipient,s)),latestRevisionShifts:personal});
            const nextShift = Math.min(...personal.filter(s=>!s.isCalloutApproved && shiftStart(s)>now.getTime()).map(shiftStart));
            if (!isSelfServiceRecipient(recipient) || !acknowledgement.needsAcknowledgement || !Number.isFinite(nextShift)) return rejected(intent,'acknowledgement_resolved');
            expiry = Math.min(expiry,nextShift,Date.parse(projection.publishedAt)+7*86400000,Date.parse(`${addDays(source.revision.weekStart,7)}T00:00:00-04:00`));
        }
    } else if (source.kind==='AVAILABILITY') {
        const deadline = Date.parse(source.settings.availabilityDeadline ?? '');
        if (intent.purpose!=='REMINDER' || !isSelfServiceRecipient(recipient) || source.submissions.some(s=>s.employeeId===recipient.employeeId && s.submitted)) return rejected(intent,'availability_resolved');
        expiry = Math.min(expiry,deadline);
    } else if (source.kind==='MANAGER_SUMMARY') {
        if (!isReviewRole(recipient) || !source.items.length) return rejected(intent,'summary_resolved');
        const coverage = source.items.filter(i=>i.type==='COVERAGE_GAP').map(i=>Date.parse(`${i.dateTime}-04:00`));
        if (intent.urgency==='high' && !coverage.some(start=>start>now.getTime() && start-now.getTime()<=12*3600000)) return rejected(intent,'urgent_source_resolved');
        expiry = Math.min(expiry,Date.parse(source.expiresAt),...coverage);
    } else if (source.kind==='SELF_TEST') {
        if (intent.purpose!=='TEST' || source.employeeId!==recipient.employeeId) return rejected(intent,'test_access_lost');
        expiry = Math.min(expiry,Date.parse(source.expiresAt));
    } else {
        if (intent.purpose==='SUMMARY') return rejected(intent,'collection_seed');
        const record = source.record;
        if (['CANCELLED','EXPIRED','PENDING','OPEN','MANAGER_PENDING'].includes(record.status)) return rejected(intent,'request_resolved_or_seed');
        if (source.kind==='EXCHANGE') {
            if (source.record.status==='EMPLOYEE_PENDING' && source.record.targetEmployeeId!==recipient.employeeId) return rejected(intent,'not_response_target');
            if (!isReviewRole(recipient) && source.record.targetShift && !recipient.allowedLocationIds.includes(source.record.targetShift.locationId)) return rejected(intent,'target_access_lost');
            expiry = Math.min(expiry,shiftStart(source.record.sourceShift),source.record.targetShift ? shiftStart(source.record.targetShift) : Infinity);
        }
    }
    if (effectiveVersion!==intent.effectiveVersion) return rejected(intent,'source_superseded');
    const destination = destinationForSource(source,recipient);
    if (!destination) return rejected(intent,'access_lost');
    const allowedTime = intent.urgency==='high' ? now : nextRoutineTime(now,DEFAULT_NOTIFICATION_POLICY);
    if (!Number.isFinite(expiry) || expiry<=allowedTime.getTime()) return rejected(intent,'expired');
    return {deliverable:true,reason:'current',effectiveVersion,expiresAt:new Date(expiry).toISOString(),destination};
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
        return [{id:`AVAILABILITY:${source.source.version}`,type:'AVAILABILITY_MISSING',priority:'MISSING_INPUT',title:'Availability review',detail:'Review missing submissions.',href:`/app/availability?week=${source.settings.weekStart}`}];
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
    const [row] = await executor.query<{deadline:string|null;updated_at:string;employees:{employeeId:string;employeeName:string}[];normal:Record<string,unknown>[];weekly:Record<string,unknown>[];submissions:Record<string,unknown>[];exceptions:Record<string,unknown>[]}>({text:`SELECT availability_deadline::text AS deadline,updated_at::text,
      (SELECT COALESCE(jsonb_agg(jsonb_build_object('employeeId',id,'employeeName',first_name || ' ' || last_name)),'[]') FROM employees WHERE active=true AND role IN ('EMPLOYEE','LEAD')) AS employees,
      (SELECT COALESCE(jsonb_agg(w),'[]') FROM availability_windows w) AS normal,
      (SELECT COALESCE(jsonb_agg(w),'[]') FROM weekly_availability_windows w WHERE week_start=$1) AS weekly,
      (SELECT COALESCE(jsonb_agg(s),'[]') FROM weekly_availability_submissions s WHERE week_start=$1) AS submissions,
      (SELECT COALESCE(jsonb_agg(e),'[]') FROM availability_exceptions e WHERE date >= $1::date AND date < $1::date + 7) AS exceptions
      FROM schedule_week_settings WHERE week_start=$1`,values:[week]});
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
async function readCoverageSource(week: string, executor: SqlExecutor): Promise<SourceSnapshot> {
    const [state,locations,coverageWindows] = await Promise.all([
        readNotificationWeekState([addDays(week,-7),week],executor),
        executor.query<HealthLocation>({text:`SELECT l.id,l.short_name AS name,s.minimum_staff_per_shift AS "minimumStaffPerShift",s.requires_designated_lead AS "requiresDesignatedLead" FROM locations l JOIN location_staffing_settings s ON s.location_id=l.id WHERE l.active=true`,values:[]}),
        executor.query<HealthCoverageWindow>({text:`SELECT location_id AS "locationId",day_of_week AS "dayOfWeek",left(start_time::text,5) AS "startTime",left(end_time::text,5) AS "endTime",minimum_staff AS "minimumStaff" FROM location_coverage_windows`,values:[]}),
    ]);
    const health = calculateScheduleHealth({locations,coverageWindows,weekDates:weekDates(week),employees:state.recipients.map(r=>({id:r.employeeId,name:'',role:r.role,active:r.active})),
        shifts:state.shifts.filter(s=>!s.isCalloutApproved && state.schedules.some(schedule=>schedule.id===s.scheduleId && schedule.status!=='ARCHIVED')).map(s=>({...s,id:s.sourceShiftId}))});
    // Health supports existing-shift fallback for its UI. Notifications require an actual configured window.
    const coverageGaps = health.coverageBlocks.filter(b=>!b.covered && coverageWindows.some(w=>w.locationId===b.locationId && w.dayOfWeek===new Date(`${b.date}T12:00:00Z`).getUTCDay() && w.startTime<b.endTime && w.endTime>b.startTime)).map(b=>({...b,requiresLead:!b.leadCovered}));
    return {kind:'MANAGER_SUMMARY',source:{kind:'MANAGER_SUMMARY',id:week,version:'configured'},updatedAt:'',weekStart:week,
        items:buildManagerActionItems({weekStart:week,coverageGaps,availabilityDeadlineSet:true,coverageRulesConfigured:true}),expiresAt:`${addDays(week,7)}T04:00:00.000Z`};
}

export function scheduleSourceSnapshot(state: GuardedWeekState, week: string): ScheduleSourceSnapshot | null {
    const history = state.revisions.filter(r=>r.weekStart===week);
    const latest = history.at(-1);
    return latest ? {kind:'SCHEDULE',source:{kind:'SCHEDULE',id:week,version:latest.id},updatedAt:latest.createdAt,revision:latest,
        previousShifts:history.flatMap(r=>r.shifts),currentShifts:latest.shifts,employeePublications:personalProjections(state,week)} : null;
}
