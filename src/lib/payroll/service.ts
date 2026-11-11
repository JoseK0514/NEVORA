/**
 * Payroll application commands and read projections. Mutations persist immutable run
 * revisions and an actor-scoped operation receipt in one guarded transaction; parsing
 * and a prior read never replace the permission/source checks at commit time.
 */
import { compatibleManagerScopeSql, payrollObjectScopeSql } from "./native/scope";
import { readPayrollBacklog } from "./backlog-read";
import { payrollNoticeDelivery } from "./notices";
import { assertPaymentExportSupported } from './payment-policy';
import { randomUUID } from "node:crypto";
import type { SqlExecutor, SqlStatement } from "../notifications/types";
import type { SessionMutationProof } from "../shift-changes/types";
import { neonNotificationExecutor } from "../data/notification-transactions";
import { timecardReadSql } from "../timecards/service";
import { parseTimecardsResponse, TIMECARD_READ_PAGE_SIZE } from "../timecards/read-model";
import type { CompleteReadManifest } from '../complete-read-pages';
import type { Population } from "../period-close/service";
import type { PayrollCapabilities, PayrollSettingsRevision, PayrollExceptionRevision, PayrollGrant, PayrollRun, PayrollReceipt, PayrollSettingsResponse, PayrollRunsResponse, PayrollJob, PayrollImport, PayrollPreferences, PayrollDocument, } from "./contracts";
import { parseSettingsCommand, parseRunCommand, parseImport, PayrollError, uuid, totals, } from "./model";
import { authority, enabled, guarded, hash, locks, statement as q, workspaceSql as ws, } from "./store";
export type Snapshot = {
    source: Source;
    settings: PayrollSettingsRevision;
    exceptions: PayrollExceptionRevision[];
    amounts: PayrollImport;
    native?: import("./native/snapshot").NativeSnapshot;
};
export type Source = {
    roster: {
        employeeId: string;
        name: string;
        active: boolean;
        locationId: string;
    }[];
    timecards: {
        cards: unknown[];
        paging?: CompleteReadManifest;
    };
    population: Population | null;
    settings: PayrollSettingsRevision[];
    exceptions: PayrollExceptionRevision[];
};
// A canonical payroll source is one JSON object, while the timecard read returns
// bounded pages. Assemble inside the same statement so both review and its exact
// commit fence see every page. Preserve the one-page JSON shape used by existing
// population hashes, and exclude the volatile observation from all source fences.
const payrollTimecardsSql = `(WITH payroll_pages AS MATERIALIZED (${timecardReadSql}),
 payroll_complete AS MATERIALIZED (
  SELECT min("totalRows") AS total_rows,count(*) AS page_count,
   CASE WHEN count(*)>0 AND min("totalRows")>=0 AND min("totalRows")=max("totalRows")
    AND count(DISTINCT "observedAt")=1 AND min("pageIndex")=0 AND max("pageIndex")+1=count(*)
    AND count(DISTINCT "pageIndex")=count(*)
    AND count(*)=GREATEST(1,(max("totalRows")::bigint+${TIMECARD_READ_PAGE_SIZE}-1)/${TIMECARD_READ_PAGE_SIZE})
    AND bool_and(jsonb_array_length(cards)=LEAST(${TIMECARD_READ_PAGE_SIZE},"totalRows"-"pageIndex"*${TIMECARD_READ_PAGE_SIZE}))
   THEN 1 ELSE (COALESCE(min("pageIndex")::text,'missing')||':PAYROLL_SOURCE_INCOMPLETE')::integer END AS complete
  FROM payroll_pages
 )
 SELECT CASE WHEN c.page_count=1 THEN (SELECT to_jsonb(p)-'observedAt' FROM payroll_pages p)
  ELSE jsonb_build_object('totalRows',c.total_rows,'pageIndex',0,
   'cards',COALESCE((SELECT jsonb_agg(r.value ORDER BY p."pageIndex",r.ordinality)
    FROM payroll_pages p CROSS JOIN LATERAL jsonb_array_elements(p.cards) WITH ORDINALITY r(value,ordinality)),'[]'::jsonb),
   'paging',jsonb_build_object('version','COMPLETE_READ_V1','pageSize',${TIMECARD_READ_PAGE_SIZE},'totalRows',c.total_rows,
    'pageCounts',(SELECT jsonb_agg(jsonb_array_length(p.cards) ORDER BY p."pageIndex") FROM payroll_pages p))) END
 FROM payroll_complete c WHERE c.complete=1)`;
export const sourceSql = `jsonb_build_object('roster',COALESCE((SELECT jsonb_agg(jsonb_build_object('employeeId',e.id,'name',trim(e.first_name||' '||e.last_name),'active',e.active,'locationId',e.primary_location_id) ORDER BY e.id COLLATE "C") FROM employees e),'[]'::jsonb),'timecards',${payrollTimecardsSql},'population',(SELECT payload FROM payroll_period_populations WHERE workspace_id=$1 AND start_date=$4::date AND end_date=$5::date ORDER BY revision DESC LIMIT 1),'settings',COALESCE((SELECT jsonb_agg(payload ORDER BY revision) FROM payroll_setting_revisions WHERE workspace_id=$1),'[]'::jsonb),'exceptions',COALESCE((SELECT jsonb_agg(payload ORDER BY employee_id,revision) FROM payroll_exception_revisions WHERE workspace_id=$1),'[]'::jsonb))`;
/** Capture the bounded roster, timecards and revision history used by review; callers
 * must carry a matching sourceGuard into the eventual write transaction. */
export async function source(proof: SessionMutationProof, p: {
    startDate: string;
    endDate: string;
}, ex: SqlExecutor) {
    const rows = await guarded<{
        id: string;
        source: Source;
        observed: string;
    }>(proof, "REVIEW", q(`SELECT ${ws} AS id,${sourceSql} AS source,clock_timestamp()::text AS observed`, await workspace(ex), true, proof.employee.id, p.startDate, p.endDate), ex);
    const row = rows[0];
    if (!row || row.source.roster.length > 300)
        throw new PayrollError("SOURCE_LIMIT", 409);
    return row;
}
async function workspace(ex: SqlExecutor) {
    const [r] = await ex.query<{
        id: string;
    }>(q(`SELECT ${ws} AS id`));
    if (!r?.id)
        throw new PayrollError("WORKSPACE_UNAVAILABLE", 503);
    return r.id;
}
async function capabilities(proof: SessionMutationProof, ex: SqlExecutor): Promise<PayrollCapabilities> {
    const [r] = await guarded<{
        owner: boolean;
        review: boolean;
        approve: boolean;
    }>(proof, "SELF", q(`SELECT e.role='OWNER' AS owner,${proof.employee.role === 'MANAGER' ? compatibleManagerScopeSql('$1', ws, 'review') : 'false'} AS review,${proof.employee.role === 'MANAGER' ? compatibleManagerScopeSql('$1', ws, 'approve') : 'false'} AS approve FROM employees e WHERE e.id=$1`, proof.employee.id), ex);
    return {
        enabled: true,
        canConfigure: r.owner,
        canReview: r.owner || r.review,
        canApprove: r.owner || r.approve,
        internalCalculatorAvailable: await (await import("./native/source.server")).nativeSchemaAvailable(ex),
        bankCompatibility: "UNVERIFIED",
        noticeDelivery: payrollNoticeDelivery(),
    };
}
async function readReceiptRecord(proof: SessionMutationProof, operationId: string, ex: SqlExecutor) {
    if (!uuid(operationId))
        throw new PayrollError("INVALID_OPERATION");
    const ownerOnly = payrollObjectScopeSql(proof, "NULL::jsonb", ws, "review", true);
    const runId = `COALESCE(saved.payload->>'runId',(SELECT run_id::text FROM payroll_jobs job WHERE job.workspace_id=saved.workspace_id AND job.id=(saved.payload->>'jobId')::uuid))`;
    const reviewScope = payrollObjectScopeSql(proof, "(target.payload->'coverage')", "target.workspace_id", "review");
    const approveScope = payrollObjectScopeSql(proof, "(target.payload->'coverage')", "target.workspace_id", "approve");
    const permitted = `${ownerOnly} OR (saved.payload->>'action' NOT IN('SAVE_SETTINGS','SAVE_EXCEPTION','SET_GRANT','SAVE_NATIVE_PROFILE','ATTEST_OPENING_YTD','SET_MANAGER_SCOPE') AND EXISTS(SELECT 1 FROM payroll_runs_current target WHERE target.workspace_id=saved.workspace_id AND target.run_id::text=${runId} AND CASE WHEN saved.payload->>'action' IN('APPROVE','PUBLISH','PAYMENT_EXPORT','RETRY_JOB') THEN ${approveScope} ELSE ${reviewScope} END))`;
    const first = [...locks(), ...authority(proof, "REVIEW")];
    const permissionCheck = q(`SELECT (CASE WHEN COALESCE((SELECT (${permitted}) FROM payroll_command_receipts saved WHERE saved.workspace_id=${ws} AND saved.actor_id=$1 AND saved.operation_id=$2::uuid),true) THEN '1' ELSE 'payroll_authorization' END)::integer`, proof.employee.id, operationId);
    const query = q(`SELECT payload,command_hash FROM payroll_command_receipts WHERE workspace_id=${ws} AND actor_id=$1 AND operation_id=$2::uuid`, proof.employee.id, operationId);
    const result = await ex.transaction([...first, permissionCheck, query, permissionCheck, ...authority(proof, "REVIEW")]);
    const saved = (result[first.length + 1] as {
        payload: PayrollReceipt;
        command_hash: string;
    }[])[0];
    if (saved?.payload.action === 'PAYMENT_EXPORT' && saved.payload.runId) {
        assertPaymentExportSupported((await readRun(proof,saved.payload.runId,ex)).payload);
    }
    return saved;
}
export async function receipt(proof: SessionMutationProof, operationId: string, ex: SqlExecutor = neonNotificationExecutor()): Promise<PayrollReceipt | null> { enabled(); return (await readReceiptRecord(proof, operationId, ex))?.payload ?? null; }
async function replay(proof: SessionMutationProof, input: {
    operationId: string;
}, ex: SqlExecutor) { const r = await readReceiptRecord(proof, input.operationId, ex); if (r && r.command_hash !== hash(input))
    throw new PayrollError("OPERATION_CONFLICT", 409); return r?.payload; }
/** Commit effects and their recovery receipt together. A concurrent identical operation
 * may win; replay returns that receipt only when the normalized command hash matches. */
async function commit(proof: SessionMutationProof, permission: "OWNER" | "REVIEW" | "APPROVE", input: {
    operationId: string;
}, result: PayrollReceipt, statements: SqlStatement[], ex: SqlExecutor) {
    const objectGuards: SqlStatement[] = [];
    if (result.runId)
        objectGuards.push(check(`EXISTS(SELECT 1 FROM payroll_runs_current guarded_run WHERE guarded_run.workspace_id=${ws} AND guarded_run.run_id=$1::uuid AND ${payrollObjectScopeSql(proof, "(guarded_run.payload->'coverage')", "guarded_run.workspace_id", permission === "APPROVE" ? "approve" : "review")})`, result.runId));
    if (result.jobId)
        objectGuards.push(check(`EXISTS(SELECT 1 FROM payroll_jobs guarded_job WHERE guarded_job.workspace_id=${ws} AND guarded_job.id=$1::uuid AND (${payrollObjectScopeSql(proof, "NULL::jsonb", ws, "approve", true)} OR EXISTS(SELECT 1 FROM payroll_runs_current guarded_run WHERE guarded_run.workspace_id=guarded_job.workspace_id AND guarded_run.run_id=guarded_job.run_id AND ${payrollObjectScopeSql(proof, "(guarded_run.payload->'coverage')", "guarded_run.workspace_id", "approve")})))`, result.jobId));
    const beforeGuards = result.runId ? [check(`NOT EXISTS(SELECT 1 FROM payroll_runs_current existing_run WHERE existing_run.workspace_id=${ws} AND existing_run.run_id=$1::uuid) OR EXISTS(SELECT 1 FROM payroll_runs_current guarded_run WHERE guarded_run.workspace_id=${ws} AND guarded_run.run_id=$1::uuid AND ${payrollObjectScopeSql(proof, "(guarded_run.payload->'coverage')", "guarded_run.workspace_id", permission === "APPROVE" ? "approve" : "review")})`, result.runId)] : objectGuards;
    try {
        await ex.transaction([
            ...locks(),
            ...authority(proof, permission),
            ...beforeGuards,
            ...statements,
            ...objectGuards,
            q(`INSERT INTO payroll_command_receipts(workspace_id,actor_id,operation_id,command_hash,payload) VALUES(${ws},$1,$2::uuid,$3,$4::jsonb)`, proof.employee.id, input.operationId, hash(input), JSON.stringify(result)),
            ...authority(proof, permission),
        ]);
        return result;
    }
    catch (error) {
        const saved = await replay(proof, input, ex);
        if (saved)
            return saved;
        throw error;
    }
}
function check(sql: string, ...values: unknown[]) {
    return q(`SELECT (CASE WHEN ${sql} THEN '1' ELSE 'PAYROLL_CONFLICT' END)::integer`, ...values);
}
export async function settings(proof: SessionMutationProof, ex: SqlExecutor = neonNotificationExecutor()): Promise<PayrollSettingsResponse> {
    const [s] = await guarded<Omit<PayrollSettingsResponse, "version" | "capabilities">>(proof, "OWNER", q(`SELECT COALESCE((SELECT jsonb_agg(payload ORDER BY revision DESC) FROM payroll_setting_revisions WHERE workspace_id=${ws}),'[]') AS revisions,COALESCE((SELECT jsonb_agg(payload ORDER BY revision DESC) FROM payroll_exception_revisions WHERE workspace_id=${ws}),'[]') AS exceptions,COALESCE((SELECT jsonb_agg(payload) FROM payroll_grants_current WHERE workspace_id=${ws}),'[]') AS grants,COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'name',trim(first_name||' '||last_name),'active',active) ORDER BY id) FROM employees),'[]') AS employees,COALESCE((SELECT jsonb_agg(jsonb_build_object('runId',run_id,'period',payload->'period','reason','Refresh review after changing applicable defaults or exceptions.')) FROM payroll_runs_current WHERE workspace_id=${ws} AND payload->>'status'<>'APPROVED'),'[]') AS "futureDraftImpact"`), ex);
    return {
        ...s,
        version: "PAYROLL_API_V1",
        capabilities: await capabilities(proof, ex),
    };
}
/** Owner-only append of settings, employee exceptions or grants. expectedRevision is
 * optimistic concurrency control for the selected revision stream; operationId is
 * reusable only for an identical command by this actor. */
export async function saveSettings(proof: SessionMutationProof, input: unknown, ex: SqlExecutor = neonNotificationExecutor()): Promise<PayrollReceipt> {
    enabled();
    const c = parseSettingsCommand(input);
    await guarded(proof, "OWNER", q("SELECT 1"), ex);
    const saved = await replay(proof, c, ex);
    if (saved)
        return saved;
    const revision = c.expectedRevision + 1, createdAt = new Date().toISOString();
    let stmts: SqlStatement[];
    if (c.action === "SAVE_SETTINGS") {
        const payload: PayrollSettingsRevision = {
            revision,
            effectiveFrom: c.effectiveFrom,
            reason: c.reason,
            preferences: c.preferences,
            actorId: proof.employee.id,
            createdAt,
        };
        stmts = [
            check(`COALESCE((SELECT max(revision) FROM payroll_setting_revisions WHERE workspace_id=${ws}),0)=$1`, c.expectedRevision),
            q(`INSERT INTO payroll_setting_revisions VALUES(${ws},$1,$2::date,$3::jsonb)`, revision, c.effectiveFrom, JSON.stringify(payload)),
        ];
    }
    else {
        const employeeId = c.action === "SAVE_EXCEPTION"
            ? c.exception.employeeId
            : c.grant.employeeId;
        stmts = [check("EXISTS(SELECT 1 FROM employees WHERE id=$1)", employeeId)];
        if (c.action === "SAVE_EXCEPTION") {
            const payload: PayrollExceptionRevision = {
                revision,
                effectiveFrom: c.effectiveFrom,
                reason: c.reason,
                exception: c.exception,
                actorId: proof.employee.id,
                createdAt,
            };
            stmts.push(check(`COALESCE((SELECT max(revision) FROM payroll_exception_revisions WHERE workspace_id=${ws} AND employee_id=$1),0)=$2`, employeeId, c.expectedRevision), q(`INSERT INTO payroll_exception_revisions VALUES(${ws},$1,$2,$3::date,$4::jsonb)`, employeeId, revision, c.effectiveFrom, JSON.stringify(payload)));
        }
        else {
            stmts.push(check(`COALESCE((SELECT max(revision) FROM payroll_grant_revisions WHERE workspace_id=${ws} AND employee_id=$1),0)=$2`, employeeId, c.expectedRevision), q(`INSERT INTO payroll_grant_revisions VALUES(${ws},$1,$2,$3::jsonb)`, employeeId, revision, JSON.stringify({
                ...c.grant,
                revision,
                reason: c.reason,
                actorId: proof.employee.id,
                createdAt,
            })));
        }
    }
    return commit(proof, "OWNER", c, { operationId: c.operationId, action: c.action, revision }, stmts, ex);
}
export function documentProjection(d: {
    id: string;
    kind: PayrollDocument["kind"];
    employee_id: string | null;
    filename: string;
    sha256: string;
    published: boolean;
}): PayrollDocument {
    return {
        id: d.id,
        kind: d.kind,
        employeeId: d.employee_id,
        filename: d.filename,
        sha256: d.sha256,
        downloadUrl: `/api/payroll/documents/${d.id}`,
        viewUrl: `/api/payroll/documents/${d.id}/view`,
        published: d.published,
    };
}
export async function runs(proof: SessionMutationProof, ex: SqlExecutor = neonNotificationExecutor()): Promise<PayrollRunsResponse> {
    const rows = await guarded<{
        payload: PayrollRun;
    }>(proof, "REVIEW", q(`SELECT c.payload FROM payroll_runs_current c WHERE c.workspace_id=${ws} AND ${payrollObjectScopeSql(proof, "(c.payload->'coverage')", "c.workspace_id")} ORDER BY payload->>'createdAt' DESC LIMIT 300`), ex);
    const documents = await guarded<{
        id: string;
        run_id: string;
        kind: PayrollDocument["kind"];
        employee_id: string | null;
        filename: string;
        sha256: string;
        published: boolean;
    }>(proof, "REVIEW", q(`SELECT d.id::text,d.run_id::text,d.kind,d.employee_id,d.filename,d.sha256,EXISTS(SELECT 1 FROM payroll_publications p WHERE p.workspace_id=d.workspace_id AND p.run_id=d.run_id) AS published FROM payroll_documents d WHERE workspace_id=${ws} AND d.run_id=ANY($1::uuid[]) AND ${payrollObjectScopeSql(proof, "(d.payload->'coverage')", "d.workspace_id")} AND (d.kind='EMPLOYEE_STATEMENT' OR ${payrollObjectScopeSql(proof, "NULL::jsonb", "d.workspace_id", "review", true)})`, rows.map((r) => r.payload.id)), ex);
    const jobs = await guarded<PayrollJob>(proof, "REVIEW", q(`SELECT id::text,run_id::text AS "runId",kind,status,attempts,error,CASE WHEN kind='REMINDER' AND status='SUCCEEDED' THEN (SELECT CASE WHEN n.payload->>'delivery'='NOT_SENT' THEN 'NOT_SENT_STUB' ELSE n.payload->>'delivery' END FROM payroll_notice_receipts n WHERE n.workspace_id=payroll_jobs.workspace_id AND n.business_key=payroll_jobs.business_key) ELSE NULL END AS outcome FROM payroll_jobs WHERE workspace_id=${ws} AND (${payrollObjectScopeSql(proof, "NULL::jsonb", ws, "review", true)} OR EXISTS(SELECT 1 FROM payroll_runs_current current_run WHERE current_run.workspace_id=payroll_jobs.workspace_id AND current_run.run_id=payroll_jobs.run_id AND ${payrollObjectScopeSql(proof, "(current_run.payload->'coverage')", "current_run.workspace_id")})) ORDER BY available_at DESC LIMIT 300`), ex);
    const backlog = await readPayrollBacklog(proof, ex);
    const responseCapabilities = await capabilities(proof, ex);
    await guarded(proof, "REVIEW", check(`(SELECT count(*) FROM payroll_runs_current current_run WHERE current_run.workspace_id=${ws} AND current_run.run_id=ANY($1::uuid[]) AND ${payrollObjectScopeSql(proof, "(current_run.payload->'coverage')", "current_run.workspace_id")})=cardinality($1::uuid[]) AND (SELECT count(*) FROM payroll_jobs final_job WHERE final_job.workspace_id=${ws} AND final_job.id=ANY($2::uuid[]) AND (${payrollObjectScopeSql(proof, "NULL::jsonb", ws, "review", true)} OR EXISTS(SELECT 1 FROM payroll_runs_current current_run WHERE current_run.workspace_id=final_job.workspace_id AND current_run.run_id=final_job.run_id AND ${payrollObjectScopeSql(proof, "(current_run.payload->'coverage')", "current_run.workspace_id")})))=cardinality($2::uuid[]) AND (SELECT count(*) FROM payroll_documents final_doc WHERE final_doc.workspace_id=${ws} AND final_doc.id=ANY($3::uuid[]) AND ${payrollObjectScopeSql(proof, "(final_doc.payload->'coverage')", "final_doc.workspace_id")} AND (final_doc.kind='EMPLOYEE_STATEMENT' OR ${payrollObjectScopeSql(proof, "NULL::jsonb", "final_doc.workspace_id", "review", true)}))=cardinality($3::uuid[])`, rows.map(r => r.payload.id), jobs.map(j => j.id), documents.map(d => d.id)), ex);
    return {
        version: "PAYROLL_API_V1",
        capabilities: responseCapabilities,
        runs: rows.map((r) => ({
            ...r.payload,
            documents: documents
                .filter((d) => d.run_id === r.payload.id)
                .map(documentProjection),
        })),
        jobs,
        ...backlog,
    };
}
export async function readRun(proof: SessionMutationProof, id: string, ex: SqlExecutor) {
    if (!uuid(id))
        throw new PayrollError("RUN_UNAVAILABLE", 404);
    const [row] = await guarded<{
        payload: PayrollRun;
        snapshot: Snapshot | null;
    }>(proof, "REVIEW", q(`SELECT c.payload,c.snapshot FROM payroll_runs_current c WHERE c.workspace_id=${ws} AND c.run_id=$1::uuid AND ${payrollObjectScopeSql(proof, "(c.payload->'coverage')", "c.workspace_id")}`, id), ex);
    if (!row)
        throw new PayrollError("RUN_UNAVAILABLE", 404);
    return row;
}
/** Build an outbox insert without executing it. The workspace/business key deduplicates
 * logical work independently of the generated job UUID; execute with the run mutation. */
export function enqueue(runId: string | null, kind: PayrollJob["kind"], key: string, payload: unknown = {}, availableAt?: string) {
    return q(`INSERT INTO payroll_jobs(id,workspace_id,run_id,kind,business_key,payload,available_at) VALUES($1::uuid,${ws},$2::uuid,$3,$4,$5::jsonb,COALESCE($6::timestamptz,clock_timestamp())) ON CONFLICT(workspace_id,business_key) DO NOTHING`, randomUUID(), runId, kind, key, JSON.stringify(payload), availableAt ?? null);
}
export function newRun(id: string, p: {
    startDate: string;
    endDate: string;
}, payday: string, correctionOf: string | null = null): PayrollRun {
    return {
        id,
        revision: 1,
        period: p,
        payday,
        status: "WAITING_FOR_AMOUNTS",
        correctionOf,
        rows: null,
        sourceAuthority: "PROVIDER_IMPORT",
        importRevision: 0,
        exceptionRevisions: [],
        sourceName: null,
        sourceReference: null,
        totals: null,
        reviewToken: null,
        settingsRevision: null,
        populationRevision: null,
        exceptions: ["WAITING_FOR_AMOUNTS"],
        documents: [],
        approvedBy: null,
        approvedAt: null,
        createdAt: new Date().toISOString(),
    };
}
export function insertRun(r: PayrollRun) {
    return q(`INSERT INTO payroll_runs VALUES(${ws},$1::uuid,$2::date,$3::date,$4::uuid)`, r.id, r.period.startDate, r.period.endDate, r.correctionOf);
}
export function insertRevision(r: PayrollRun, s: Snapshot | null) {
    return q(`INSERT INTO payroll_run_revisions VALUES(${ws},$1::uuid,$2,$3::jsonb,$4::jsonb)`, r.id, r.revision, JSON.stringify(r), s === null ? null : JSON.stringify(s));
}
function revisionGuard(r: PayrollRun) {
    return check(`(SELECT revision FROM payroll_runs_current WHERE workspace_id=${ws} AND run_id=$1::uuid)=$2`, r.id, r.revision);
}
/** Resolve defaults by payday (not period start), then by revision for equal dates. */
export function resolveSettings(s: Source, payday: string) {
    return s.settings
        .filter((r) => r.effectiveFrom <= payday)
        .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) ||
        b.revision - a.revision)[0];
}
export function resolveExceptions(s: Source, payday: string) {
    const result = new Map<string, PayrollExceptionRevision>();
    for (const e of [...s.exceptions]
        .filter((r) => r.effectiveFrom <= payday)
        .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom) ||
        a.revision - b.revision))
        result.set(e.exception.employeeId, e);
    return [...result.values()];
}
/** Reject a commit if any captured source JSON changed after the review read. */
export function sourceGuard(s: Awaited<ReturnType<typeof source>>, r: PayrollRun, proof: SessionMutationProof) {
    return check(`${sourceSql}=$6::jsonb`, s.id, true, proof.employee.id, r.period.startDate, r.period.endDate, JSON.stringify(s.source));
}
function importSnapshot(s: Awaited<ReturnType<typeof source>>, amounts: PayrollImport) {
    const settings = resolveSettings(s.source, amounts.payday);
    if (!settings)
        throw new PayrollError("SETTINGS_REQUIRED", 409);
    const population = s.source.population;
    if (!population ||
        population.members.length !== s.source.roster.length ||
        new Set(population.members.map((m) => m.employeeId)).size !==
            s.source.roster.length ||
        !s.source.roster.every((e) => population.members.some((m) => m.employeeId === e.employeeId)))
        throw new PayrollError("POPULATION_REVIEW_REQUIRED", 409);
    const periodSource = {
        roster: s.source.roster,
        timecards: s.source.timecards,
    };
    if (population.sourceHash !== hash(periodSource))
        throw new PayrollError("POPULATION_SOURCE_CONFLICT", 409);
    const cards = parseTimecardsResponse({ ...s.source.timecards, observedAt: s.observed }, amounts.period).cards;
    const failures: string[] = [];
    for (const member of population.members) {
        const card = cards.find((c) => c.card.employeeId === member.employeeId);
        const row = amounts.rows.find((r) => r.employeeId === member.employeeId)!;
        if (member.disposition === "INCLUDE" && card?.state !== "FINALIZED")
            failures.push(`TIME_NOT_FINALIZED:${member.employeeId}`);
        if (member.disposition !== "INCLUDE" &&
            (row.grossMinor !== "0" ||
                row.netMinor !== "0" ||
                row.employerContributions.some((l) => l.amountMinor !== "0")))
            failures.push(`POPULATION_DISPOSITION:${member.employeeId}`);
    }
    return {
        snapshot: {
            source: s.source,
            settings,
            exceptions: resolveExceptions(s.source, amounts.payday),
            amounts,
        } satisfies Snapshot,
        failures,
    };
}
/** Validate and authorize a payroll state transition, recovering identical operation
 * receipts before doing new work. Review/approval tokens bind the captured inputs;
 * approval schedules document work, while publication remains a separate job. */
export async function command(proof: SessionMutationProof, input: unknown, ex: SqlExecutor = neonNotificationExecutor()): Promise<PayrollReceipt> {
    enabled();
    const c = parseRunCommand(input);
    const permission = c.action === "APPROVE" ||
        c.action === "PUBLISH" ||
        c.action === "PAYMENT_EXPORT" ||
        c.action === "RETRY_JOB"
        ? "APPROVE"
        : "REVIEW";
    await guarded(proof, permission, q("SELECT 1"), ex);
    if (c.action === 'PAYMENT_EXPORT') assertPaymentExportSupported((await readRun(proof,c.runId,ex)).payload);
    const saved = await replay(proof, c, ex);
    if (saved)
        return saved;
    const { captureNativePayroll, nativeSchemaAvailable } = await import("./native/source.server");
    if (c.action === "PREPARE") {
        const existing = await guarded<{
            payload: PayrollRun;
        }>(proof, "REVIEW", q(`SELECT c.payload FROM payroll_runs r JOIN payroll_runs_current c ON c.workspace_id=r.workspace_id AND c.run_id=r.id WHERE r.workspace_id=${ws} AND start_date=$1::date AND end_date=$2::date AND correction_of IS NULL AND ${payrollObjectScopeSql(proof, "(c.payload->'coverage')", "c.workspace_id")}`, c.period.startDate, c.period.endDate), ex);
        if (existing[0] && existing[0].payload.payday !== c.payday)
            throw new PayrollError("PAYDAY_CONFLICT", 409);
        if (existing[0])
            return commit(proof, "REVIEW", c, {
                operationId: c.operationId,
                action: c.action,
                runId: existing[0].payload.id,
                revision: existing[0].payload.revision,
            }, [], ex);
        const initial = newRun(c.operationId, c.period, c.payday);
        const seed = await nativeSchemaAvailable(ex) ? await source(proof, initial.period, ex) : null;
        const captured = seed ? await captureNativePayroll(seed, initial, ex, authority(proof, "REVIEW")) : null;
        const r = captured?.run ?? initial;
        try {
            return await commit(proof, "REVIEW", c, {
                operationId: c.operationId,
                action: c.action,
                runId: r.id,
                revision: 1,
            }, [...(seed ? [sourceGuard(seed, r, proof)] : []), ...(captured?.guards ?? []), insertRun(r), insertRevision(r, captured?.snapshot ?? null)], ex);
        }
        catch (error) {
            const retry = await replay(proof, c, ex);
            if (retry)
                return retry;
            const winner = await guarded<{
                id: string;
                revision: number;
                payday: string;
            }>(proof, "REVIEW", q(`SELECT r.id::text,c.revision,c.payload->>'payday' AS payday FROM payroll_runs r JOIN payroll_runs_current c ON c.workspace_id=r.workspace_id AND c.run_id=r.id WHERE r.workspace_id=${ws} AND r.start_date=$1::date AND r.end_date=$2::date AND r.correction_of IS NULL AND ${payrollObjectScopeSql(proof, "(c.payload->'coverage')", "c.workspace_id")}`, c.period.startDate, c.period.endDate), ex);
            if (winner[0] && winner[0].payday !== c.payday)
                throw new PayrollError("PAYDAY_CONFLICT", 409);
            if (winner[0])
                return commit(proof, "REVIEW", c, {
                    operationId: c.operationId,
                    action: c.action,
                    runId: winner[0].id,
                    revision: winner[0].revision,
                }, [], ex);
            if (proof.employee.role === "MANAGER")
                throw new PayrollError("RUN_UNAVAILABLE", 404);
            throw error;
        }
    }
    if (c.action === "RETRY_JOB")
        return commit(proof, "APPROVE", c, { operationId: c.operationId, action: c.action, jobId: c.jobId }, [
            check(`EXISTS(SELECT 1 FROM payroll_jobs WHERE workspace_id=${ws} AND id=$1::uuid AND status='FAILED')`, c.jobId),
            q(`UPDATE payroll_jobs SET status='PENDING',attempts=0,error=NULL,available_at=clock_timestamp(),lease_token=NULL,lease_until=NULL WHERE workspace_id=${ws} AND id=$1::uuid`, c.jobId),
        ], ex);
    const current = await readRun(proof, c.runId, ex), r = current.payload;
    if (r.revision !== c.expectedRevision)
        throw new PayrollError("REVISION_CONFLICT", 409);
    if (c.action === "CORRECT_NATIVE") {
        if (r.sourceAuthority !== "NATIVE_RECORDED_TIME" || r.status !== "APPROVED" || !current.snapshot?.native || r.nativeCalculation?.state !== "ready")
            throw new PayrollError("RUN_STATE_CONFLICT", 409);
        const latest = check(`NOT EXISTS(SELECT 1 FROM payroll_runs child JOIN payroll_runs_current head ON head.workspace_id=child.workspace_id AND head.run_id=child.id WHERE child.workspace_id=${ws} AND child.correction_of=$1::uuid AND head.payload->>'status'='APPROVED')`, r.id);
        await guarded(proof, "REVIEW", latest, ex);
        const rootRunId = r.nativeCorrection?.rootRunId ?? current.snapshot.native.originalRunId;
        const candidate = { ...newRun(c.operationId, r.period, r.payday, r.id), nativeCorrection: { rootRunId, reason: c.reason } };
        const seed = await source(proof, r.period, ex), captured = await captureNativePayroll(seed, candidate, ex, authority(proof, "REVIEW"), rootRunId);
        return commit(proof, "REVIEW", c, { operationId: c.operationId, action: c.action, runId: candidate.id, revision: 1 }, [revisionGuard(r), latest, sourceGuard(seed, r, proof), ...captured.guards, insertRun(captured.run), insertRevision(captured.run, captured.snapshot)], ex);
    }
    if (c.action === "RECALCULATE") {
        if (r.sourceAuthority !== "NATIVE_RECORDED_TIME" || r.status === "APPROVED")
            throw new PayrollError("RUN_STATE_CONFLICT", 409);
        const seed = await source(proof, r.period, ex);
        const captured = await captureNativePayroll(seed, { ...r, revision: r.revision + 1 }, ex, authority(proof, "REVIEW"), r.nativeCorrection?.rootRunId ?? current.snapshot?.native?.originalRunId ?? r.correctionOf ?? r.id);
        return commit(proof, "REVIEW", c, { operationId: c.operationId, action: c.action, runId: r.id, revision: captured.run.revision }, [revisionGuard(r), sourceGuard(seed, r, proof), ...captured.guards, insertRevision(captured.run, captured.snapshot)], ex);
    }
    let next: PayrollRun, stmts: SqlStatement[], snapshot = current.snapshot;
    if (c.action === "IMPORT" || c.action === "CORRECT") {
        if (r.sourceAuthority === "NATIVE_RECORDED_TIME")
            throw new PayrollError("NATIVE_AMOUNT_INPUT_FORBIDDEN", 409);
        if ((c.action === "IMPORT" && r.status === "APPROVED") ||
            (c.action === "CORRECT" && r.status !== "APPROVED"))
            throw new PayrollError("RUN_STATE_CONFLICT", 409);
        const s = await source(proof, r.period, ex);
        const amounts = parseImport(c.amounts, s.source.roster.map((e) => e.employeeId));
        if (hash(amounts.period) !== hash(r.period) || amounts.payday !== r.payday)
            throw new PayrollError("IMPORT_PERIOD_CONFLICT", 409);
        const result = importSnapshot(s, amounts);
        snapshot = result.snapshot;
        next = {
            ...r,
            ...(c.action === "CORRECT"
                ? newRun(c.operationId, r.period, r.payday, r.id)
                : {}),
            revision: c.action === "CORRECT" ? 1 : r.revision + 1,
            status: "REVIEW_REQUIRED",
            rows: amounts.rows.map((row) => ({
                ...row,
                employeeName: s.source.roster.find((e) => e.employeeId === row.employeeId)!.name,
            })),
            sourceName: amounts.sourceName,
            sourceReference: amounts.sourceReference,
            importRevision: r.importRevision + 1,
            settingsRevision: snapshot.settings.revision,
            exceptionRevisions: snapshot.exceptions.map((e) => ({
                employeeId: e.exception.employeeId,
                revision: e.revision,
            })),
            populationRevision: s.source.population!.revision,
            totals: totals(amounts),
            exceptions: result.failures,
            reviewToken: hash(snapshot),
        };
        if (c.action === "CORRECT")
            next.exceptions.push(`CORRECTION_REASON:${c.reason}`);
        stmts = [
            revisionGuard(r),
            sourceGuard(s, r, proof),
            ...(c.action === "CORRECT" ? [insertRun(next)] : []),
            insertRevision(next, snapshot),
        ];
    }
    else if (c.action === "APPROVE") {
        if (r.status !== "REVIEW_REQUIRED" ||
            !snapshot ||
            !r.reviewToken ||
            r.reviewToken !== c.reviewToken)
            throw new PayrollError("REVIEW_CONFLICT", 409);
        if (r.sourceAuthority === "NATIVE_RECORDED_TIME") {
            const seed = await source(proof, r.period, ex);
            const captured = await captureNativePayroll(seed, r, ex, authority(proof, "APPROVE"), snapshot.native?.originalRunId ?? r.id);
            if (!captured.snapshot || captured.run.status !== "REVIEW_REQUIRED" || captured.run.reviewToken !== r.reviewToken || hash(captured.run.nativeCalculation) !== hash(r.nativeCalculation))
                throw new PayrollError("NATIVE_REVIEW_STALE", 409);
            const approved: PayrollRun = { ...r, revision: r.revision + 1, status: "APPROVED", approvedBy: proof.employee.id, approvedAt: new Date().toISOString() };
            const { preflightDocumentGlyphs } = await import("./documents");
            await preflightDocumentGlyphs(approved, captured.snapshot);
            const { nativeLedgerStatements } = await import("./native/ledger.server");
            return commit(proof, "APPROVE", c, { operationId: c.operationId, action: c.action, runId: r.id, revision: approved.revision }, [revisionGuard(r), sourceGuard(seed, r, proof), ...captured.guards, insertRevision(approved, captured.snapshot), ...nativeLedgerStatements(approved, captured.snapshot), enqueue(r.id, "PDF", `pdf:${r.id}`)], ex);
        }
        const s = await source(proof, r.period, ex);
        if (hash(s.source) !== hash(snapshot.source))
            throw new PayrollError("SOURCE_CONFLICT", 409);
        const { preflightDocumentGlyphs } = await import("./documents");
        await preflightDocumentGlyphs(r, snapshot);
        const checked = importSnapshot(s, snapshot.amounts);
        if (checked.failures.length)
            throw new PayrollError("FINALIZED_TIME_REQUIRED", 409);
        next = {
            ...r,
            revision: r.revision + 1,
            status: "APPROVED",
            approvedBy: proof.employee.id,
            approvedAt: new Date().toISOString(),
        };
        stmts = [
            revisionGuard(r),
            sourceGuard(s, r, proof),
            insertRevision(next, snapshot),
            enqueue(r.id, "PDF", `pdf:${r.id}`),
        ];
    }
    else {
        if (r.status !== "APPROVED" || !snapshot)
            throw new PayrollError("APPROVAL_REQUIRED", 409);
        next = r;
        if (c.action === "PAYMENT_EXPORT") {
            if (r.sourceAuthority === "NATIVE_RECORDED_TIME")
                throw new PayrollError("NATIVE_PAYMENT_EXPORT_UNAVAILABLE", 409);
            const { paymentDocument } = await import("./documents");
            const doc = paymentDocument(r, snapshot);
            stmts = [revisionGuard(r), doc.statement];
            return commit(proof, "APPROVE", c, {
                operationId: c.operationId,
                action: c.action,
                runId: r.id,
                revision: r.revision,
                documentId: doc.id,
            }, stmts, ex);
        }
        stmts = [revisionGuard(r), enqueue(r.id, "PUBLISH", `publish:${r.id}`)];
    }
    return commit(proof, permission, c, {
        operationId: c.operationId,
        action: c.action,
        runId: next.id,
        revision: next.revision,
    }, stmts, ex);
}
/** Safe layout projection: disabled flag never queries payroll tables. */
export function payrollFeatureEnabled(env: NodeJS.ProcessEnv = process.env) {
    return env.NEVORA_PAYROLL_ENABLED === "true";
}
export async function readPayrollCapabilities(proof: SessionMutationProof, executor: SqlExecutor = neonNotificationExecutor()): Promise<PayrollCapabilities> {
    if (!payrollFeatureEnabled())
        return {
            enabled: false,
            canConfigure: false,
            canReview: false,
            canApprove: false,
            internalCalculatorAvailable: false,
            bankCompatibility: "UNVERIFIED",
        };
    return capabilities(proof, executor);
}
