/**
 * Private payroll notifications reference metadata sources rather than embedding
 * financial snapshots. Source/version, current access, publication and automation
 * settings are checked again when an intent is queued and before delivery.
 */
import { randomUUID } from "node:crypto";
import type { NotificationIntent, SqlExecutor, SqlStatement, SourceCheck, } from "../notifications/types";
import type { Workspace } from "../domain";
import { readNotificationConfig } from "../notifications/config";
import { notificationIntentStatements } from "../data/notifications";
import { getWorkspace, workspaceReadGuard } from "../data/workspaces";
import { hash, statement as q } from "./store";
import type { ClaimedJob } from "./worker";
export function payrollNoticeDelivery(env: Record<string, string | undefined> = process.env): "ENABLED" | "DISABLED" {
    const c = readNotificationConfig(env);
    return c.featureEnabled &&
        c.deliveryEnabled &&
        (c.environment === "production" ||
            (c.testDeliveryEnabled && c.testAccountIds.length > 0))
        ? "ENABLED"
        : "DISABLED";
}
const preparationRecipient = (actor: string, workspace: string) => `(${actor}.role='OWNER' OR (to_regclass('native_payroll_manager_scopes_current') IS NULL AND ${actor}.role='MANAGER' AND EXISTS(SELECT 1 FROM payroll_grants_current grant_record WHERE grant_record.workspace_id=${workspace} AND grant_record.employee_id=${actor}.id AND grant_record.payload->>'review'='true')))`;
/** This query reads metadata and current rights only, never approved financial snapshots. */
export const payrollNoticeReadSql = (id = '$1', recipient = '$2') => `SELECT n.version,n.kind FROM payroll_notice_sources n
 JOIN workspaces w ON w.id=n.workspace_id AND w.singleton AND w.active
 JOIN employees e ON e.id=${recipient} AND e.active
 JOIN locations l ON l.id=e.primary_location_id AND l.workspace_id=w.id
 WHERE n.id=${id}::text::uuid AND (n.kind<>'PAYROLL_PREPARATION' OR (to_jsonb(e)->'management_alert_choices'->>'payroll-ready') IS DISTINCT FROM 'false') AND n.payload->>'workspaceVersion'=w.updated_at::text AND (
 (n.kind='PAYROLL_PREPARATION'
 AND ${preparationRecipient('e', 'w.id')}
 AND EXISTS(SELECT 1 FROM payroll_setting_revisions s WHERE s.workspace_id=w.id AND s.revision=(n.payload->>'settingsRevision')::integer AND s.payload->'preferences'->'automation'->>'reminders'='true' AND s.revision=(SELECT revision FROM payroll_setting_revisions WHERE workspace_id=w.id AND effective_from<=(clock_timestamp() AT TIME ZONE w.time_zone)::date ORDER BY effective_from DESC,revision DESC LIMIT 1))
 AND NOT EXISTS(SELECT 1 FROM payroll_runs r JOIN payroll_runs_current c ON c.workspace_id=r.workspace_id AND c.run_id=r.id WHERE r.workspace_id=w.id AND r.start_date=(n.payload->'period'->>'startDate')::date AND r.end_date=(n.payload->'period'->>'endDate')::date AND r.correction_of IS NULL AND c.payload->>'status'='APPROVED'))
 OR (n.kind='PAYROLL_STATEMENT' AND (SELECT payload->'preferences'->'automation'->>'reminders' FROM payroll_setting_revisions WHERE workspace_id=w.id AND effective_from<=(clock_timestamp() AT TIME ZONE w.time_zone)::date ORDER BY effective_from DESC,revision DESC LIMIT 1)='true' AND EXISTS(SELECT 1 FROM payroll_documents d JOIN payroll_publications p ON p.workspace_id=d.workspace_id AND p.run_id=d.run_id JOIN payroll_runs_current r ON r.workspace_id=d.workspace_id AND r.run_id=d.run_id WHERE d.workspace_id=w.id AND d.id=n.id AND d.kind='EMPLOYEE_STATEMENT' AND d.employee_id=e.id AND r.payload->>'status'='APPROVED')))`;
const authorized = payrollNoticeReadSql();
export async function checkPayrollNotice(intent: NotificationIntent, recipientId: string, now: Date, ex: SqlExecutor, workspace?: Workspace): Promise<SourceCheck> {
    const no = (reason: string): SourceCheck => ({
        deliverable: false,
        reason,
        effectiveVersion: intent.effectiveVersion,
        expiresAt: intent.expiresAt,
    });
    if (process.env.NEVORA_PAYROLL_ENABLED !== "true")
        return no("payroll_disabled");
    if (intent.employeeId !== recipientId ||
        intent.type !== intent.source.kind ||
        intent.purpose !== "REMINDER" ||
        !Number.isFinite(Date.parse(intent.expiresAt)) ||
        Date.parse(intent.expiresAt) <= now.getTime())
        return no("payroll_source_invalid");
    try {
        const current = await getWorkspace(ex);
        if (workspace &&
            (workspace.id !== current.id ||
                workspace.updatedAt !== current.updatedAt ||
                workspace.timeZone !== current.timeZone))
            return no("workspace_changed");
        const [r] = await ex.query<{
            version: string;
            kind: string;
        }>(q(authorized, intent.source.id, recipientId));
        if (!r ||
            r.kind !== intent.source.kind ||
            r.version !== intent.source.version ||
            r.version !== intent.effectiveVersion)
            return no("payroll_source_or_access_lost");
        return {
            deliverable: true,
            reason: "current_private_payroll_source",
            effectiveVersion: r.version,
            expiresAt: intent.expiresAt,
            // A statement notice opens that exact statement; My pay rechecks it is still own and published.
            destination: r.kind === "PAYROLL_PREPARATION" ? "/app/payroll" : `/app/my-pay?statement=${intent.source.id.toLowerCase()}`,
        };
    }
    catch {
        return no("payroll_source_unavailable");
    }
}
/** Read candidate recipients and build fenced outbox/source/receipt statements for
 * finishJob. Returning these statements does not send a push or prove delivery. */
export async function payrollNoticeStatements(job: ClaimedJob, ex: SqlExecutor): Promise<SqlStatement[]> {
    const workspace = await getWorkspace(ex), config = readNotificationConfig(process.env), now = new Date();
    const preparation = job.payload.phase === "PREPARATION";
    const sources = preparation
        ? [{ id: job.id, employeeId: null as string | null }]
        : await ex.query<{
            id: string;
            employeeId: string;
        }>(q(`SELECT d.id::text,d.employee_id AS "employeeId" FROM payroll_documents d JOIN payroll_publications p ON p.workspace_id=d.workspace_id AND p.run_id=d.run_id JOIN payroll_runs_current r ON r.workspace_id=d.workspace_id AND r.run_id=d.run_id WHERE d.workspace_id=$1 AND d.run_id=$2::uuid AND d.kind='EMPLOYEE_STATEMENT' AND r.payload->>'status'='APPROVED'`, job.workspace_id, job.runId));
    if (!preparation && !sources.length)
        throw Error("PUBLICATION_REQUIRED");
    const statements: SqlStatement[] = [...workspaceReadGuard(workspace)];
    for (const source of sources) {
        const kind = preparation ? "PAYROLL_PREPARATION" : "PAYROLL_STATEMENT";
        const payload = {
            workspaceVersion: workspace.updatedAt,
            ...(preparation
                ? {
                    period: job.payload.period,
                    settingsRevision: job.payload.settingsRevision,
                }
                : {}),
        };
        const version = hash({
            kind,
            source: source.id,
            workspace: workspace.id,
            payload,
        });
        statements.push(q("INSERT INTO payroll_notice_sources(id,workspace_id,kind,version,payload) VALUES($1::uuid,$2,$3,$4,$5::jsonb) ON CONFLICT DO NOTHING", source.id, workspace.id, kind, version, JSON.stringify(payload)));
        const recipients = await ex.query<{
            id: string;
        }>(q(`SELECT e.id FROM employees e JOIN locations l ON l.id=e.primary_location_id WHERE l.workspace_id=$1 AND e.active AND ($2::text IS NOT NULL AND e.id=$2 OR $2::text IS NULL AND ${preparationRecipient('e', 'l.workspace_id')})`, workspace.id, source.employeeId));
        for (const recipient of recipients) {
            const intent: NotificationIntent = {
                id: randomUUID(),
                employeeId: recipient.id,
                type: kind,
                title: "NEVORA update",
                body: "Open NEVORA to review your update.",
                eventKey: `payroll:${hash({ kind, id: source.id, employee: recipient.id, environment: config.environment })}`,
                environment: config.environment,
                source: { kind, id: source.id, version },
                effectiveVersion: version,
                purpose: "REMINDER",
                urgency: "normal",
                dueAt: now.toISOString(),
                expiresAt: new Date(now.getTime() + 30 * 86400000).toISOString(),
            };
            // Select current recipients inside the fenced transaction; revoked recipients are omitted.
            const base = notificationIntentStatements([intent])[0];
            statements.push({
                ...base,
                text: base.text.replace("VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'pending')", `SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'pending' WHERE EXISTS(${authorized.replaceAll("$1", "$10")})`),
            });
        }
    }
    // Record actual inserted intent count, not the number of candidate recipients.
    statements.push(q(`INSERT INTO payroll_notice_receipts(workspace_id,business_key,payload) SELECT $1,$2,jsonb_build_object('transport','PRIVATE_PUSH_OUTBOX','delivery',CASE WHEN count(*)=0 THEN 'NO_CURRENT_RECIPIENTS' ELSE $3 END,'intentCount',count(*)) FROM notifications WHERE environment=$4 AND source_id=ANY($5::text[]) AND source_kind IN('PAYROLL_PREPARATION','PAYROLL_STATEMENT') ON CONFLICT DO NOTHING`, workspace.id, job.business_key, payrollNoticeDelivery() === "ENABLED"
        ? "QUEUED"
        : "QUEUED_DELIVERY_DISABLED", config.environment, sources.map((s) => s.id)));
    return statements;
}
