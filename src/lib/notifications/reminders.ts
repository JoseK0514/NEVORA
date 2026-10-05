import { businessDate } from '../business-time';
import { workspaceReadGuard } from '../data/workspaces';
import { createHash, randomUUID } from 'node:crypto';
import { buildNotificationIntents } from './recipients';
import { nextRoutineTime, notificationBoundary } from './policy';
import { destinationForSource, isReviewRole } from './destinations';
import { summaryMemberKey, summarySourceRef, isCurrentCoverageAttentionSeed, summarySourceItems, parseSummaryMember, scheduleSourceSnapshot, evaluateNotificationSource } from '../data/notification-state';
import { readNotificationWeekState, notificationWeekStateGuard, scheduleWeekLockStatements } from '../data/notification-transactions';
import { notificationIntentStatements } from '../data/notifications';
import type { NotificationIntent, SourceSnapshot, RecipientAccess, PushEnvironment, NotificationPolicy, NotificationStateRepository, NotificationConfig, SqlExecutor, SqlStatement, WorkerReport } from './types';
/** Task 8 WorkerDeps extends this trigger-agnostic contract with delivery/provider dependencies. */
export type ReminderDeps = {state:NotificationStateRepository;executor:SqlExecutor;config:NotificationConfig;clock():Date};
type SummaryInput = {source:SourceSnapshot;expiresAt:string;seedId?:string;urgency?:NotificationIntent['urgency']};
export function planSourceReminders(source:SourceSnapshot,recipients:readonly RecipientAccess[],now:Date,environment:PushEnvironment,policy:NotificationPolicy):NotificationIntent[] {
    if (source.kind!=='AVAILABILITY' && source.kind!=='SCHEDULE') return [];
    // The scanner is not a new publication. Preserve the effective personal clock.
    return buildNotificationIntents({after:source,before:source.kind==='SCHEDULE'?source:undefined,recipients,now,environment,policy}).filter(i=>i.purpose==='REMINDER');
}
export function buildSummaryGroup(sources:readonly SummaryInput[],recipient:RecipientAccess,now:Date,environment:PushEnvironment,policy:NotificationPolicy,consumed:ReadonlySet<string>):NotificationIntent|null {
    if (!recipient.active || !isReviewRole(recipient)) return null;
    const candidates = sources.flatMap(input=>{
        if (Date.parse(input.expiresAt)<=now.getTime() || !destinationForSource(input.source,recipient)) return [];
        if (input.source.kind==='AVAILABILITY' && Date.parse(input.source.settings.availabilityDeadline ?? '')>now.getTime()) return [];
        return summarySourceItems(input.source).filter(item=>item.type!=='COVERAGE_GAP' || notificationBoundary(item.dateTime ?? '',policy.timeZone)>now.getTime()).map(item=>({...input,item}));
    });
    let remaining = candidates;
    let high = false;
    let due = now;
    let fresh: [string,typeof candidates[number]][] = [];
    // Removing consumed urgent work can move the surviving routine group to tomorrow.
    for (let pass=0;pass<2;pass++) {
        high = remaining.some(({item})=>item.type==='COVERAGE_GAP' && notificationBoundary(item.dateTime ?? '',policy.timeZone)-now.getTime()<=policy.urgentLeadHours*3600000);
        const collected = remaining.some(input=>input.seedId || input.source.kind==='AVAILABILITY');
        const collectionTime = collected ? now : new Date(now.getTime()+policy.managerCollectionMinutes*60000);
        due = high ? now : nextRoutineTime(collectionTime,policy);
        const unique = new Map(remaining.map(input=>[summaryMemberKey({source:summarySourceRef(input.source,input.urgency),itemId:input.item.id,budget:input.source.kind==='AVAILABILITY'?'deadline':businessDate(due,policy.timeZone)}),input]));
        fresh = [...unique].filter(([key])=>!consumed.has(key));
        remaining = fresh.map(([,input])=>input);
    }
    if (!fresh.length) return null;
    const itemKeys = fresh.map(([key])=>key).sort();
    const expiresAt = new Date(Math.min(...fresh.map(([,i])=>Date.parse(i.expiresAt)),...fresh.filter(([,i])=>i.item.type==='COVERAGE_GAP').map(([,i])=>notificationBoundary(i.item.dateTime ?? '',policy.timeZone)))).toISOString();
    if (Date.parse(expiresAt)<=due.getTime()) return null;
    const id = randomUUID();
    const version = createHash('sha256').update(JSON.stringify(itemKeys)).digest('hex');
    const summary: SourceSnapshot = {kind:'MANAGER_SUMMARY',source:{kind:'MANAGER_SUMMARY',id,version},updatedAt:now.toISOString(),weekStart:'',items:fresh.map(([,i])=>i.item),expiresAt};
    // Reuse Task 1 recipient/copy/privacy policy, then use the already collected due time.
    const [intent] = buildNotificationIntents({after:summary,recipients:[recipient],now:new Date(now.getTime()-policy.managerCollectionMinutes*60000),environment,policy});
    if (!intent) return null;
    return {...intent,id,source:summary.source,effectiveVersion:version,itemKeys,urgency:high?'high':'normal',dueAt:due.toISOString(),expiresAt,
        eventKey:[environment,'MANAGER_SUMMARY',recipient.employeeId,version].join(':')};
}
function cancelIntentStatement(intent: NotificationIntent, terminal: 'cancelled' | 'expired' = 'cancelled'): SqlStatement {
    return {text:`WITH cancelled AS (UPDATE notifications SET push_state=$3,cancelled_at=CASE WHEN $3='cancelled' THEN now() ELSE NULL END
      WHERE id=$1 AND environment=$2 AND push_state IN ('pending','materialized','no_active_subscription') RETURNING id)
      UPDATE push_deliveries SET status=$3,lease_token=NULL,lease_expires_at=NULL,updated_at=now()
      WHERE notification_id IN (SELECT id FROM cancelled) AND status IN ('queued','retry_pending','processing')`,values:[intent.id,intent.environment,terminal]};
}
async function persistReminder(intent: NotificationIntent, deps:ReminderDeps, withinBudget:()=>boolean) {
    const {executor} = deps;
    const insert = notificationIntentStatements([intent])[0];
    // Account-level budget is independent of installation count or edited deadline version.
    let sql = insert.text.replace('VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,\'pending\')',`SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'pending'
      WHERE NOT EXISTS (SELECT 1 FROM notifications n WHERE n.environment=$8 AND n.employee_id=$2 AND n.source_kind=$9 AND n.source_id=$10 AND n.purpose='REMINDER'
        AND (n.event_key=$7 OR (n.due_at AT TIME ZONE $18)::date=($15::timestamptz AT TIME ZONE $18)::date))`);
    if (intent.source.kind==='AVAILABILITY') {
        sql = sql.replace('WHERE NOT EXISTS', `WHERE EXISTS (SELECT 1 FROM schedule_week_settings w WHERE w.week_start=$10::text::date AND w.availability_deadline=$11::text::timestamptz AND w.availability_deadline>clock_timestamp())
          AND EXISTS (SELECT 1 FROM employees e WHERE e.id=$2 AND e.active=true AND e.role IN ('EMPLOYEE','LEAD'))
          AND NOT EXISTS (SELECT 1 FROM weekly_availability_submissions s WHERE s.week_start=$10::text::date AND s.employee_id=$2 AND s.submitted_at IS NOT NULL)
          AND NOT EXISTS`);
    }
    for (let attempt=0;attempt<3;attempt++) {
        if (!withinBudget()) return;
        const guarded: SqlStatement[] = deps.config.workspace ? workspaceReadGuard(deps.config.workspace) : [];
        if (intent.source.kind==='SCHEDULE') {
            const current = await readNotificationWeekState([intent.source.id],executor);
            const access = current.recipients.find(r=>r.employeeId===intent.employeeId) ?? null;
            if (!evaluateNotificationSource(intent,access,scheduleSourceSnapshot(current,intent.source.id),deps.clock(),deps.config.policy).deliverable) return;
            guarded.push(...scheduleWeekLockStatements([intent.source.id]),notificationWeekStateGuard(intent.source.id,current));
        } else {
            guarded.push({text:`SELECT pg_advisory_xact_lock(hashtextextended('availability:' || $1,0))`,values:[intent.source.id]});
        }
        try {
            if (!withinBudget()) return;
            await executor.transaction([
                ...guarded,
                {text:`SELECT pg_advisory_xact_lock(hashtextextended('reminder-account:' || $1 || ':' || $2 || ':' || $3,0))`,values:[intent.environment,intent.employeeId,businessDate(new Date(intent.dueAt),deps.config.policy.timeZone)]},
                {...insert,text:sql,values:[...insert.values,deps.config.policy.timeZone]},
            ]);
            return;
        } catch (error) {
            if (!(error instanceof Error && 'code' in error && error.code==='22P02' && error.message.includes('notification_source_conflict')) || attempt===2) throw error;
        }
    }
}
async function persistGroup(inputs:readonly SummaryInput[],recipient:RecipientAccess,now:Date,deps:ReminderDeps,withinBudget:()=>boolean):Promise<void> {
    const {executor,config} = deps;
    for (let attempt=0;attempt<3;attempt++) {
        if (!withinBudget()) return;
        const consumed = await executor.query<{key:string}>({text:`SELECT DISTINCT unnest(item_keys) AS key FROM notifications WHERE environment=$1 AND employee_id=$2 AND source_kind='MANAGER_SUMMARY' AND purpose='SUMMARY' AND item_keys && $3::text[]`,values:[config.environment,recipient.employeeId,summaryKeyVariants(inputs,now,config.policy).flat()]});
        const intent = buildSummaryGroup(inputs,recipient,now,config.environment,config.policy,new Set(consumed.map(r=>r.key)));
        if (!intent) return;
        try {
            if (!withinBudget()) return;
            await executor.transaction([
                ...(config.workspace ? workspaceReadGuard(config.workspace) : []),
                // The account lock also fences the deadline lifetime budget across midnight.
                {text:`SELECT pg_advisory_xact_lock(hashtextextended('manager-account:' || $1 || ':' || $2,0))`,values:[config.environment,recipient.employeeId]},
                {text:`SELECT pg_advisory_xact_lock(hashtextextended('manager-day:' || $1 || ':' || $2 || ':' || $3,0))`,values:[config.environment,recipient.employeeId,businessDate(new Date(intent.dueAt),deps.config.policy.timeZone)]},
                // A conflict aborts and rebuilds the group with the winner's consumed items.
                {text:`SELECT (CASE WHEN NOT EXISTS (SELECT 1 FROM notifications WHERE environment=$1 AND employee_id=$2 AND source_kind='MANAGER_SUMMARY' AND purpose='SUMMARY' AND item_keys && $3::text[]) THEN '1' ELSE 'notification_group_conflict' END)::integer`,values:[config.environment,recipient.employeeId,intent.itemKeys]},
                ...notificationIntentStatements([intent]),
                {text:`UPDATE notifications SET push_state='materialized' WHERE id=ANY($1::text[]) AND environment=$2 AND employee_id=$3 AND purpose='SUMMARY' AND source_kind<>'MANAGER_SUMMARY' AND push_state='pending'`,values:[inputs.filter(input=>(intent.itemKeys??[]).some(key=>{const member=parseSummaryMember(key);return member?.source.kind===input.source.kind && member.source.id===input.source.source.id && member.source.version===summarySourceRef(input.source,input.urgency).version;})).flatMap(i=>i.seedId?[i.seedId]:[]),config.environment,recipient.employeeId]},
            ]);
            return;
        } catch (error) {
            if (!(error instanceof Error && 'code' in error && error.code==='22P02' && error.message.includes('notification_group_conflict')) || attempt===2) throw error;
        }
    }
}
/** Every possible day after consumed urgent work is removed, grouped by logical item. */
function summaryKeyVariants(inputs:readonly SummaryInput[],now:Date,policy:NotificationPolicy):string[][] {
    const days = [...new Set([businessDate(now,policy.timeZone),businessDate(nextRoutineTime(now,policy),policy.timeZone),businessDate(nextRoutineTime(new Date(now.getTime()+policy.managerCollectionMinutes*60000),policy),policy.timeZone)])];
    return inputs.filter(input=>Date.parse(input.expiresAt)>now.getTime()).flatMap(input=>summarySourceItems(input.source).filter(item=>item.type!=='COVERAGE_GAP' || notificationBoundary(item.dateTime ?? '',policy.timeZone)>now.getTime()).map(item=>(input.source.kind==='AVAILABILITY'?['deadline']:days).map(budget=>summaryMemberKey({source:summarySourceRef(input.source,input.urgency),itemId:item.id,budget}))));
}
function compatibleInputs(inputs:readonly SummaryInput[]):SummaryInput[][] {
    return [inputs.filter(input=>summarySourceItems(input.source).some(item=>item.type==='COVERAGE_GAP')),
        inputs.filter(input=>!summarySourceItems(input.source).some(item=>item.type==='COVERAGE_GAP'))].filter(group=>group.length);
}
function sourceSummaryInput(source:SourceSnapshot,now:Date):SummaryInput|null {
    if (source.kind==='AVAILABILITY' && Date.parse(source.settings.availabilityDeadline??'')<=now.getTime()) return {source,expiresAt:new Date(Date.parse(source.settings.availabilityDeadline!)+72*3600000).toISOString()};
    if (source.kind==='MANAGER_SUMMARY') return {source,expiresAt:source.expiresAt};
    return null;
}
/** Existing notification identities are the persistent continuation, not a new scan ledger. */
function reminderRecipientStatement(source:SourceSnapshot,now:Date,config:NotificationConfig,limit:number):SqlStatement|null {
    const selfIds = source.kind==='AVAILABILITY' ? source.submissions.filter(s=>!s.submitted).map(s=>s.employeeId)
        : source.kind==='SCHEDULE' ? [...new Set(source.currentShifts.map(s=>s.employeeId))] : [];
    const candidates = selfIds.map(employeeId=>({employeeId,active:true,role:'EMPLOYEE' as const,allowedLocationIds:source.kind==='SCHEDULE'?source.currentShifts.filter(s=>s.employeeId===employeeId).map(s=>s.locationId):[]}));
    const plans = planSourceReminders(source,candidates,now,config.environment,config.policy);
    if (!plans.length) return null;
    const budgets = Object.fromEntries(plans.map(intent=>[intent.employeeId,{version:intent.effectiveVersion,day:businessDate(new Date(intent.dueAt),config.policy.timeZone),locations:candidates.find(c=>c.employeeId===intent.employeeId)!.allowedLocationIds}]));
    return {text:`SELECT id FROM employees e WHERE active=true AND role IN ('EMPLOYEE','LEAD') AND id=ANY($2::text[])
      AND ($4<>'AVAILABILITY' OR NOT EXISTS (SELECT 1 FROM weekly_availability_submissions s WHERE s.week_start=$5::date AND s.employee_id=e.id AND s.submitted_at IS NOT NULL))
      AND ($4<>'SCHEDULE' OR EXISTS (SELECT 1 FROM employee_location_eligibility elig WHERE elig.employee_id=e.id AND elig.location_id IN (SELECT jsonb_array_elements_text($3::jsonb->e.id->'locations'))))
      AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.environment=$1 AND n.employee_id=e.id AND n.source_kind=$4 AND n.source_id=$5::text AND n.purpose='REMINDER'
        AND (n.effective_version=$3::jsonb->e.id->>'version' OR (n.due_at AT TIME ZONE $7)::date=($3::jsonb->e.id->>'day')::date))
      ORDER BY id LIMIT $6`,values:[config.environment,plans.map(i=>i.employeeId),JSON.stringify(budgets),source.kind,source.source.id,limit,config.policy.timeZone]};
}
function managerRecipientStatement(input:SummaryInput,now:Date,config:NotificationConfig,limit:number):SqlStatement|null {
    if (!buildSummaryGroup([input],{employeeId:'candidate',role:'MANAGER',active:true,allowedLocationIds:[]},now,config.environment,config.policy,new Set())) return null;
    const candidates = summaryKeyVariants([input],now,config.policy);
    if (!candidates.length || Date.parse(input.expiresAt)<=now.getTime()) return null;
    return {text:`SELECT id FROM employees e WHERE active=true AND role IN ('OWNER','MANAGER')
      AND EXISTS (SELECT 1 FROM jsonb_array_elements($2::jsonb) item WHERE NOT EXISTS (
        SELECT 1 FROM notifications n WHERE n.environment=$1 AND n.employee_id=e.id AND n.source_kind='MANAGER_SUMMARY' AND n.purpose='SUMMARY'
          AND n.item_keys && ARRAY(SELECT jsonb_array_elements_text(item))))
      ORDER BY id LIMIT $3`,values:[config.environment,JSON.stringify(candidates),limit]};
}
/** Bounded intent reconciliation/materialization only. Device fanout belongs to Task 8. */
export async function runReminders(deps:ReminderDeps):Promise<WorkerReport> {
    const {state,executor,config,clock} = deps;
    const report:WorkerReport = {claimed:0,accepted:0,retried:0,failed:0,expired:0,cancelled:0,noSubscription:0,disabled:!config.featureEnabled};
    if (!config.featureEnabled) return report;
    const started = clock();
    const withinBudget = () => clock().getTime()-started.getTime()<config.policy.budgetMs;
    // Reserve source-processing time so outstanding delivery rows cannot monopolize every scan.
    const withinReconciliationBudget = () => clock().getTime()-started.getTime()<config.policy.budgetMs/4;
    // Collection cannot spend the time reserved for committing its durable progress.
    // Leave at least half the overall budget for source/account processing.
    const withinSeedFlushBudget = () => clock().getTime()-started.getTime()<config.policy.budgetMs/2;
    const limit = Math.min(100,config.policy.batchSize*10);
    const ids = await executor.query<{id:string}>({text:`SELECT id FROM notifications WHERE environment=$1 AND push_state IN ('pending','materialized','no_active_subscription')
      AND purpose IN ('REMINDER','SUMMARY')
      AND (push_state='pending' OR EXISTS (SELECT 1 FROM push_deliveries d WHERE d.notification_id=notifications.id AND d.status IN ('queued','retry_pending','processing')))
      AND (purpose<>'SUMMARY' OR source_kind='MANAGER_SUMMARY' OR push_state='pending')
      AND (due_at<=$2 OR purpose='REMINDER') ORDER BY due_at,id LIMIT $3`,values:[config.environment,started.toISOString(),limit]});
    const groups = new Map<string,SummaryInput[]>();
    for (const {id} of ids) {
        if (!withinReconciliationBudget()) break;
        const intent = await state.findIntent(id);
        if (!intent || intent.environment!==config.environment || !withinReconciliationBudget()) continue;
        report.claimed++;
        const now = clock();
        if (intent.purpose==='SUMMARY' && intent.source.kind!=='MANAGER_SUMMARY') {
            const source = await state.readSource(intent.source);
            if (!withinReconciliationBudget()) break;
            const access = await state.recipientAccess(intent.employeeId);
            if (!withinReconciliationBudget()) break;
            const items = source ? summarySourceItems(source) : [];
            if (!source || (source.source.version!==intent.effectiveVersion && !isCurrentCoverageAttentionSeed(intent,source)) || !access?.active || !isReviewRole(access) || !destinationForSource(source,access) || !items.length || Date.parse(intent.expiresAt)<=now.getTime()) {
                await executor.transaction([cancelIntentStatement(intent)]);report.cancelled++;continue;
            }
            groups.set(intent.employeeId,[...(groups.get(intent.employeeId)??[]),{source,expiresAt:intent.expiresAt,seedId:intent.id,urgency:intent.urgency}]);
        } else {
            const check = await state.check(intent,intent.employeeId,now);
            if (!withinReconciliationBudget()) break;
            if (!check.deliverable) {
                await executor.transaction([cancelIntentStatement(intent,check.reason==='expired'?'expired':'cancelled')]);
                if (check.reason==='expired') report.expired++; else report.cancelled++;
            }
        }
    }
    // Persist already-collected seeds before scanning unrelated sources.
    for (const [employeeId,inputs] of groups) {
        if (!withinSeedFlushBudget()) break;
        const recipient = await state.recipientAccess(employeeId);
        if (recipient?.active && isReviewRole(recipient)) for (const compatible of compatibleInputs(inputs)) {
            if (!withinSeedFlushBudget()) break;
            await persistGroup(compatible,recipient,clock(),deps,withinSeedFlushBudget);
        }
    }
    if (!withinBudget()) return report;
    async function visit(source:SourceSnapshot) {
        if (!withinBudget()) return;
        const selfStatement = reminderRecipientStatement(source,clock(),config,limit);
        if (selfStatement) {
            const accounts = await executor.query<{id:string}>(selfStatement);
            for (const {id} of accounts) {
                if (!withinBudget()) return;
                const recipient = await state.recipientAccess(id);
                if (!withinBudget()) return;
                if (!recipient?.active) continue;
                for (const intent of planSourceReminders(source,[recipient],clock(),config.environment,config.policy)) {
                    if (!withinBudget()) return;
                    await persistReminder(intent,deps,withinBudget);
                }
            }
        }
        if (!withinBudget()) return;
        const input = sourceSummaryInput(source,clock());
        const statement = input && managerRecipientStatement(input,clock(),config,limit);
        if (!statement || !input) return;
        const accounts = await executor.query<{id:string}>(statement);
        for (const {id} of accounts) {
            if (!withinBudget()) return;
            const recipient = await state.recipientAccess(id);
            if (recipient?.active && isReviewRole(recipient) && withinBudget()) await persistGroup([input],recipient,clock(),deps,withinBudget);
        }
    }
    let visited = false;
    const sources = await state.listReminderCandidates(clock(),limit,withinBudget,async source=>{visited=true;await visit(source);});
    // Optional visitor keeps existing injected repositories compatible; production visits lazily.
    if (!visited) for (const source of sources) { if (!withinBudget()) break; await visit(source); }
    return report;
}
