import { payrollNoticeStatements } from "./notices";
import { randomUUID } from "node:crypto";
import type { SqlExecutor, SqlStatement } from "../notifications/types";
import { neonNotificationExecutor } from "../data/notification-transactions";
import type { PayrollRun, PayrollJob } from "./contracts";
import { enqueue, insertRevision, insertRun, newRun, type Snapshot, type Source, sourceSql, } from "./service";
import { generatePdfs } from "./documents";
import { enabled, locks, statement as q, workspaceSql as ws } from "./store";
export type ClaimedJob = PayrollJob & {
    workspace_id: string;
    payload: Record<string, unknown>;
    lease_token: string;
    business_key: string;
};
export async function claimJob(ex: SqlExecutor = neonNotificationExecutor()): Promise<ClaimedJob | null> {
    enabled();
    const token = randomUUID();
    const rows = await ex.query<ClaimedJob>(q(`WITH next AS(SELECT id FROM payroll_jobs WHERE workspace_id=${ws} AND attempts<5 AND available_at<=clock_timestamp() AND (status='PENDING' OR (status='RUNNING' AND lease_until<clock_timestamp())) ORDER BY available_at,id FOR UPDATE SKIP LOCKED LIMIT 1) UPDATE payroll_jobs j SET status='RUNNING',attempts=j.attempts+1,lease_token=$1::uuid,lease_until=clock_timestamp()+interval '60 seconds' FROM next WHERE j.id=next.id RETURNING j.id::text,j.workspace_id,j.run_id::text AS "runId",j.kind,j.status,j.attempts,j.error,j.payload,j.lease_token::text,j.business_key`, token));
    return rows[0] ?? null;
}
export function fence(job: ClaimedJob) {
    return [
        q("SELECT id FROM payroll_jobs WHERE id=$1::uuid FOR UPDATE", job.id),
        q(`SELECT (CASE WHEN EXISTS(SELECT 1 FROM payroll_jobs WHERE id=$1::uuid AND lease_token=$2::uuid AND status='RUNNING' AND lease_until>clock_timestamp()) THEN '1' ELSE 'PAYROLL_LEASE_LOST' END)::integer`, job.id, job.lease_token),
    ];
}
export async function finishJob(job: ClaimedJob, statements: SqlStatement[], ex: SqlExecutor) {
    await ex.transaction([
        ...locks(),
        q(`SELECT (CASE WHEN ${ws}=$1 THEN '1' ELSE 'WORKSPACE_UNAVAILABLE' END)::integer`, job.workspace_id),
        ...fence(job),
        ...(job.payload.settingsRevision !== undefined
            ? [
                q(`SELECT (CASE WHEN (SELECT revision FROM payroll_setting_revisions s JOIN workspaces w ON w.id=s.workspace_id WHERE w.singleton AND w.active AND s.effective_from<=(clock_timestamp() AT TIME ZONE w.time_zone)::date ORDER BY s.effective_from DESC,s.revision DESC LIMIT 1)=$1 THEN '1' ELSE 'SCHEDULE_CHANGED' END)::integer`, job.payload.settingsRevision),
            ]
            : []),
        ...statements,
        ...fence(job),
        q(`UPDATE payroll_jobs SET status='SUCCEEDED',lease_token=NULL,lease_until=NULL,error=NULL WHERE id=$1::uuid AND lease_token=$2::uuid`, job.id, job.lease_token),
    ]);
}
export async function processJob(job: ClaimedJob, ex: SqlExecutor = neonNotificationExecutor()) {
    enabled();
    try {
        if (job.kind === "REMINDER") {
            await finishJob(job, await payrollNoticeStatements(job, ex), ex);
            return;
        }
        if (job.kind === "PREPARE") {
            const period = job.payload.period as {
                startDate: string;
                endDate: string;
            }, payday = String(job.payload.payday);
            let r = newRun(job.id, period, payday);
            let snapshot: Snapshot | null = null;
            let sourceGuards: SqlStatement[] = [];
            const [existing] = await ex.query(q("SELECT id FROM payroll_runs WHERE workspace_id=$1 AND start_date=$2::date AND end_date=$3::date AND correction_of IS NULL", job.workspace_id, period.startDate, period.endDate));
            if (!existing) {
                const { nativeSchemaAvailable, captureNativePayroll, exactReadFence } = await import("./native/source.server");
                if (await nativeSchemaAvailable(ex)) {
                    const active = q(`SELECT (CASE WHEN ${ws}=$1 THEN '1' ELSE 'WORKSPACE_UNAVAILABLE' END)::integer`, job.workspace_id);
                    const values = [job.workspace_id, true, "native-payroll-worker", period.startDate, period.endDate];
                    const read = q(`SELECT $1::text AS id,${sourceSql} AS source,clock_timestamp()::text AS observed WHERE ${ws}=$1`, ...values);
                    const prefix = [...locks(), ...fence(job), active], results = await ex.transaction([...prefix, read, ...fence(job)]);
                    const [seed] = results[prefix.length] as {
                        id: string;
                        source: Source;
                        observed: string;
                    }[];
                    if (!seed)
                        throw Error("WORKSPACE_UNAVAILABLE");
                    const progress = async () => { const renewed = await ex.query(q("UPDATE payroll_jobs SET lease_until=clock_timestamp()+interval '60 seconds' WHERE id=$1::uuid AND lease_token=$2::uuid AND status='RUNNING' AND lease_until>clock_timestamp() RETURNING id", job.id, job.lease_token)); if (!renewed.length)
                        throw Error("PAYROLL_LEASE_LOST"); };
                    const captured = await captureNativePayroll(seed, r, ex, [...fence(job), active], r.id, progress);
                    r = captured.run;
                    snapshot = captured.snapshot;
                    sourceGuards = [active, exactReadFence(q(`SELECT ${sourceSql} AS source WHERE ${ws}=$1`, ...values), [{ source: seed.source }]), ...captured.guards];
                }
            }
            await finishJob(job, [
                ...sourceGuards,
                q("SELECT (CASE WHEN NOT EXISTS(SELECT 1 FROM payroll_runs r JOIN payroll_runs_current c ON c.workspace_id=r.workspace_id AND c.run_id=r.id WHERE r.workspace_id=$1 AND r.start_date=$2::date AND r.end_date=$3::date AND r.correction_of IS NULL AND c.payload->>'payday'<>$4) THEN '1' ELSE 'PAYDAY_CONFLICT' END)::integer", job.workspace_id, period.startDate, period.endDate, payday),
                ...(existing ? [] : [insertRun(r), insertRevision(r, snapshot)]),
            ], ex);
            return;
        }
        const [row] = await ex.query<{
            payload: PayrollRun;
            snapshot: Snapshot;
        }>(q("SELECT payload,snapshot FROM payroll_runs_current WHERE workspace_id=$1 AND run_id=$2::uuid", job.workspace_id, job.runId));
        if (!row || row.payload.status !== "APPROVED")
            throw Error("APPROVAL_REQUIRED");
        const { payload: run, snapshot } = row;
        let stmts: SqlStatement[] = [];
        if (job.kind === "PDF") {
            const docs = await generatePdfs(run, snapshot, async () => {
                const renewed = await ex.query(q("UPDATE payroll_jobs SET lease_until=clock_timestamp()+interval '60 seconds' WHERE id=$1::uuid AND lease_token=$2::uuid AND status='RUNNING' AND lease_until>clock_timestamp() RETURNING id", job.id, job.lease_token));
                if (!renewed.length)
                    throw Error("PAYROLL_LEASE_LOST");
            });
            stmts = docs.map((d) => d.statement);
            if (run.sourceAuthority === "NATIVE_RECORDED_TIME") {
                const { nativeDocumentManifestStatements } = await import("./native/document-manifest.server");
                stmts.push(...nativeDocumentManifestStatements(run, docs));
            }
            if (run.sourceAuthority === "NATIVE_RECORDED_TIME" || snapshot.settings.preferences.automation.publish)
                stmts.push(enqueue(run.id, "PUBLISH", `publish:${run.id}`));
        }
        else if (job.kind === "PUBLISH") {
            const nativeGuard = run.sourceAuthority === "NATIVE_RECORDED_TIME" ? (await import("./native/document-manifest.server")).nativePublicationGuard(run) : null;
            stmts = [
                nativeGuard ?? q(`SELECT (CASE WHEN (SELECT count(*) FROM payroll_documents WHERE workspace_id=$1 AND run_id=$2::uuid AND kind IN('EMPLOYEE_STATEMENT','COMPANY_SUMMARY'))=$3 THEN '1' ELSE 'PDF_NOT_READY' END)::integer`, job.workspace_id, run.id, run.rows!.length + 1),
                q("INSERT INTO payroll_publications(workspace_id,run_id) VALUES($1,$2::uuid) ON CONFLICT DO NOTHING", job.workspace_id, run.id),
            ];
            if (snapshot.settings.preferences.automation.reminders)
                stmts.push(enqueue(run.id, "REMINDER", `notice:${run.id}`, {
                    privatePath: "/app/my-pay",
                    delivery: "DISABLED",
                }));
        }
        await finishJob(job, stmts, ex);
    }
    catch (error) {
        await ex.query(q(`UPDATE payroll_jobs SET status=CASE WHEN attempts>=5 OR $3 IN('SCHEDULE_CHANGED','PAYDAY_CONFLICT','UNSUPPORTED_DOCUMENT_GLYPH') THEN 'FAILED' ELSE 'PENDING' END,error=$3,available_at=clock_timestamp()+make_interval(secs=>LEAST(3600,30*attempts)),lease_token=NULL,lease_until=NULL WHERE id=$1::uuid AND lease_token=$2::uuid AND status='RUNNING'`, job.id, job.lease_token, error instanceof Error &&
            error.message.includes("UNSUPPORTED_DOCUMENT_GLYPH")
            ? "UNSUPPORTED_DOCUMENT_GLYPH"
            : error instanceof Error && error.message.includes("SCHEDULE_CHANGED")
                ? "SCHEDULE_CHANGED"
                : error instanceof Error &&
                    error.message.includes("PAYDAY_CONFLICT")
                    ? "PAYDAY_CONFLICT"
                    : error instanceof Error &&
                        error.message.includes("PAYROLL_LEASE_LOST")
                        ? "LEASE_LOST"
                        : "JOB_FAILED"));
        throw error;
    }
}
export async function workerOnce(ex: SqlExecutor = neonNotificationExecutor()) {
    enabled();
    await ex.query(q(`UPDATE payroll_jobs SET status='FAILED',error='LEASE_EXHAUSTED',lease_token=NULL,lease_until=NULL WHERE status='RUNNING' AND lease_until<clock_timestamp() AND attempts>=5 AND workspace_id=${ws}`));
    const job = await claimJob(ex);
    if (!job)
        return { processed: false };
    await processJob(job, ex);
    return { processed: true, jobId: job.id };
}
