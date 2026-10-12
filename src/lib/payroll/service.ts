import { payrollHistorySql } from "./history";
import { missingPayrollPeriods } from "./backlog";
import { payrollNoticeDelivery } from "./notices";
import { randomUUID } from "node:crypto";
import type { SqlExecutor, SqlStatement } from "../notifications/types";
import type { SessionMutationProof } from "../shift-changes/types";
import { neonNotificationExecutor } from "../data/notification-transactions";
import { timecardReadSql } from "../timecards/service";
import { parseTimecardsResponse } from "../timecards/read-model";
import type { Population } from "../period-close/service";
import type {
  PayrollCapabilities,
  PayrollSettingsRevision,
  PayrollExceptionRevision,
  PayrollGrant,
  PayrollRun,
  PayrollReceipt,
  PayrollSettingsResponse,
  PayrollRunsResponse,
  PayrollJob,
  PayrollImport,
  PayrollPreferences,
  PayrollDocument,
} from "./contracts";
import {
  parseSettingsCommand,
  parseRunCommand,
  parseImport,
  PayrollError,
  uuid,
  totals,
} from "./model";
import {
  authority,
  enabled,
  guarded,
  hash,
  locks,
  statement as q,
  workspaceSql as ws,
} from "./store";
export type Snapshot = {
  source: Source;
  settings: PayrollSettingsRevision;
  exceptions: PayrollExceptionRevision[];
  amounts: PayrollImport;
};
type Source = {
  roster: {
    employeeId: string;
    name: string;
    active: boolean;
    locationId: string;
  }[];
  timecards: { cards: unknown[] };
  population: Population | null;
  settings: PayrollSettingsRevision[];
  exceptions: PayrollExceptionRevision[];
};
const sourceSql = `jsonb_build_object('roster',COALESCE((SELECT jsonb_agg(jsonb_build_object('employeeId',e.id,'name',trim(e.first_name||' '||e.last_name),'active',e.active,'locationId',e.primary_location_id) ORDER BY e.id COLLATE "C") FROM employees e),'[]'::jsonb),'timecards',(SELECT to_jsonb(t)-'observedAt' FROM (${timecardReadSql}) t),'population',(SELECT payload FROM payroll_period_populations WHERE workspace_id=$1 AND start_date=$4::date AND end_date=$5::date ORDER BY revision DESC LIMIT 1),'settings',COALESCE((SELECT jsonb_agg(payload ORDER BY revision) FROM payroll_setting_revisions WHERE workspace_id=$1),'[]'::jsonb),'exceptions',COALESCE((SELECT jsonb_agg(payload ORDER BY employee_id,revision) FROM payroll_exception_revisions WHERE workspace_id=$1),'[]'::jsonb))`;
async function source(
  proof: SessionMutationProof,
  p: { startDate: string; endDate: string },
  ex: SqlExecutor,
) {
  const rows = await guarded<{ id: string; source: Source; observed: string }>(
    proof,
    "REVIEW",
    q(
      `SELECT ${ws} AS id,${sourceSql} AS source,clock_timestamp()::text AS observed`,
      await workspace(ex),
      true,
      proof.employee.id,
      p.startDate,
      p.endDate,
    ),
    ex,
  );
  const row = rows[0];
  if (!row || row.source.roster.length > 300)
    throw new PayrollError("SOURCE_LIMIT", 409);
  return row;
}
async function workspace(ex: SqlExecutor) {
  const [r] = await ex.query<{ id: string }>(q(`SELECT ${ws} AS id`));
  if (!r?.id) throw new PayrollError("WORKSPACE_UNAVAILABLE", 503);
  return r.id;
}
async function capabilities(
  proof: SessionMutationProof,
  ex: SqlExecutor,
): Promise<PayrollCapabilities> {
  const [r] = await guarded<{
    owner: boolean;
    review: boolean;
    approve: boolean;
  }>(
    proof,
    "SELF",
    q(
      `SELECT e.role='OWNER' AS owner,COALESCE((g.payload->>'review')::boolean,false) AS review,COALESCE((g.payload->>'approve')::boolean,false) AS approve FROM employees e LEFT JOIN payroll_grants_current g ON g.employee_id=e.id AND g.workspace_id=${ws} WHERE e.id=$1`,
      proof.employee.id,
    ),
    ex,
  );
  return {
    enabled: true,
    canConfigure: r.owner,
    canReview: r.owner || r.review,
    canApprove: r.owner || r.approve,
    internalCalculatorAvailable: false,
    bankCompatibility: "UNVERIFIED",
    noticeDelivery: payrollNoticeDelivery(),
  };
}
export async function receipt(
  proof: SessionMutationProof,
  operationId: string,
  ex: SqlExecutor = neonNotificationExecutor(),
): Promise<PayrollReceipt | null> {
  if (!uuid(operationId)) throw new PayrollError("INVALID_OPERATION");
  const rows = await guarded<{ payload: PayrollReceipt }>(
    proof,
    "REVIEW",
    q(
      `SELECT payload FROM payroll_command_receipts WHERE workspace_id=${ws} AND actor_id=$1 AND operation_id=$2::uuid`,
      proof.employee.id,
      operationId,
    ),
    ex,
  );
  return rows[0]?.payload ?? null;
}
async function replay(
  proof: SessionMutationProof,
  input: { operationId: string },
  ex: SqlExecutor,
) {
  const [r] = await guarded<{ payload: PayrollReceipt; command_hash: string }>(
    proof,
    "REVIEW",
    q(
      `SELECT payload,command_hash FROM payroll_command_receipts WHERE workspace_id=${ws} AND actor_id=$1 AND operation_id=$2::uuid`,
      proof.employee.id,
      input.operationId,
    ),
    ex,
  );
  if (r && r.command_hash !== hash(input))
    throw new PayrollError("OPERATION_CONFLICT", 409);
  return r?.payload;
}
async function commit(
  proof: SessionMutationProof,
  permission: "OWNER" | "REVIEW" | "APPROVE",
  input: { operationId: string },
  result: PayrollReceipt,
  statements: SqlStatement[],
  ex: SqlExecutor,
) {
  try {
    await ex.transaction([
      ...locks(),
      ...authority(proof, permission),
      ...statements,
      q(
        `INSERT INTO payroll_command_receipts(workspace_id,actor_id,operation_id,command_hash,payload) VALUES(${ws},$1,$2::uuid,$3,$4::jsonb)`,
        proof.employee.id,
        input.operationId,
        hash(input),
        JSON.stringify(result),
      ),
      ...authority(proof, permission),
    ]);
    return result;
  } catch (error) {
    const saved = await replay(proof, input, ex);
    if (saved) return saved;
    throw error;
  }
}
function check(sql: string, ...values: unknown[]) {
  return q(
    `SELECT (CASE WHEN ${sql} THEN '1' ELSE 'PAYROLL_CONFLICT' END)::integer`,
    ...values,
  );
}
export async function settings(
  proof: SessionMutationProof,
  ex: SqlExecutor = neonNotificationExecutor(),
): Promise<PayrollSettingsResponse> {
  const [s] = await guarded<
    Omit<PayrollSettingsResponse, "version" | "capabilities">
  >(
    proof,
    "OWNER",
    q(
      `SELECT COALESCE((SELECT jsonb_agg(payload ORDER BY revision DESC) FROM payroll_setting_revisions WHERE workspace_id=${ws}),'[]') AS revisions,COALESCE((SELECT jsonb_agg(payload ORDER BY revision DESC) FROM payroll_exception_revisions WHERE workspace_id=${ws}),'[]') AS exceptions,COALESCE((SELECT jsonb_agg(payload) FROM payroll_grants_current WHERE workspace_id=${ws}),'[]') AS grants,COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'name',trim(first_name||' '||last_name),'active',active) ORDER BY id) FROM employees),'[]') AS employees,COALESCE((SELECT jsonb_agg(jsonb_build_object('runId',run_id,'period',payload->'period','reason','Refresh review after changing applicable defaults or exceptions.')) FROM payroll_runs_current WHERE workspace_id=${ws} AND payload->>'status'<>'APPROVED'),'[]') AS "futureDraftImpact"`,
    ),
    ex,
  );
  return {
    ...s,
    version: "PAYROLL_API_V1",
    capabilities: await capabilities(proof, ex),
  };
}
export async function saveSettings(
  proof: SessionMutationProof,
  input: unknown,
  ex: SqlExecutor = neonNotificationExecutor(),
): Promise<PayrollReceipt> {
  enabled();
  const c = parseSettingsCommand(input);
  await guarded(proof, "OWNER", q("SELECT 1"), ex);
  const saved = await replay(proof, c, ex);
  if (saved) return saved;
  const revision = c.expectedRevision + 1,
    createdAt = new Date().toISOString();
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
      check(
        `COALESCE((SELECT max(revision) FROM payroll_setting_revisions WHERE workspace_id=${ws}),0)=$1`,
        c.expectedRevision,
      ),
      q(
        `INSERT INTO payroll_setting_revisions VALUES(${ws},$1,$2::date,$3::jsonb)`,
        revision,
        c.effectiveFrom,
        JSON.stringify(payload),
      ),
    ];
  } else {
    const employeeId =
      c.action === "SAVE_EXCEPTION"
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
      stmts.push(
        check(
          `COALESCE((SELECT max(revision) FROM payroll_exception_revisions WHERE workspace_id=${ws} AND employee_id=$1),0)=$2`,
          employeeId,
          c.expectedRevision,
        ),
        q(
          `INSERT INTO payroll_exception_revisions VALUES(${ws},$1,$2,$3::date,$4::jsonb)`,
          employeeId,
          revision,
          c.effectiveFrom,
          JSON.stringify(payload),
        ),
      );
    } else {
      stmts.push(
        check(
          `COALESCE((SELECT max(revision) FROM payroll_grant_revisions WHERE workspace_id=${ws} AND employee_id=$1),0)=$2`,
          employeeId,
          c.expectedRevision,
        ),
        q(
          `INSERT INTO payroll_grant_revisions VALUES(${ws},$1,$2,$3::jsonb)`,
          employeeId,
          revision,
          JSON.stringify({
            ...c.grant,
            revision,
            reason: c.reason,
            actorId: proof.employee.id,
            createdAt,
          }),
        ),
      );
    }
  }
  return commit(
    proof,
    "OWNER",
    c,
    { operationId: c.operationId, action: c.action, revision },
    stmts,
    ex,
  );
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
    published: d.published,
  };
}
export async function runs(
  proof: SessionMutationProof,
  ex: SqlExecutor = neonNotificationExecutor(),
): Promise<PayrollRunsResponse> {
  const rows = await guarded<{ payload: PayrollRun }>(
    proof,
    "REVIEW",
    q(
      `SELECT payload FROM payroll_runs_current WHERE workspace_id=${ws} ORDER BY payload->>'createdAt' DESC LIMIT 300`,
    ),
    ex,
  );
  const documents = await guarded<{
    id: string;
    run_id: string;
    kind: PayrollDocument["kind"];
    employee_id: string | null;
    filename: string;
    sha256: string;
    published: boolean;
  }>(
    proof,
    "REVIEW",
    q(
      `SELECT d.id::text,d.run_id::text,d.kind,d.employee_id,d.filename,d.sha256,EXISTS(SELECT 1 FROM payroll_publications p WHERE p.workspace_id=d.workspace_id AND p.run_id=d.run_id) AS published FROM payroll_documents d WHERE workspace_id=${ws} AND d.run_id=ANY($1::uuid[])`,
      rows.map((r) => r.payload.id),
    ),
    ex,
  );
  const jobs = await guarded<PayrollJob>(
    proof,
    "REVIEW",
    q(
      `SELECT id::text,run_id::text AS "runId",kind,status,attempts,error,CASE WHEN kind='REMINDER' AND status='SUCCEEDED' THEN (SELECT CASE WHEN n.payload->>'delivery'='NOT_SENT' THEN 'NOT_SENT_STUB' ELSE n.payload->>'delivery' END FROM payroll_notice_receipts n WHERE n.workspace_id=payroll_jobs.workspace_id AND n.business_key=payroll_jobs.business_key) ELSE NULL END AS outcome FROM payroll_jobs WHERE workspace_id=${ws} ORDER BY available_at DESC LIMIT 300`,
    ),
    ex,
  );
  const [history] = await guarded<{
    today: string;
    history: PayrollSettingsRevision[];
    originals: { startDate: string; endDate: string }[];
    overflow: boolean;
  }>(proof, "REVIEW", q(payrollHistorySql), ex);
  const backlog = missingPayrollPeriods(
    history.history,
    history.originals,
    history.today,
  );
  if (history.overflow) {
    backlog.missingPeriods = [];
    backlog.backlog = {
      ...backlog.backlog,
      missingCount: null,
      remainingCount: null,
      ambiguousCount: null,
      returnedCount: 0,
      overflow: true,
    };
  }
  return {
    version: "PAYROLL_API_V1",
    capabilities: await capabilities(proof, ex),
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
export async function readRun(
  proof: SessionMutationProof,
  id: string,
  ex: SqlExecutor,
) {
  if (!uuid(id)) throw new PayrollError("RUN_UNAVAILABLE", 404);
  const [row] = await guarded<{
    payload: PayrollRun;
    snapshot: Snapshot | null;
  }>(
    proof,
    "REVIEW",
    q(
      `SELECT payload,snapshot FROM payroll_runs_current WHERE workspace_id=${ws} AND run_id=$1::uuid`,
      id,
    ),
    ex,
  );
  if (!row) throw new PayrollError("RUN_UNAVAILABLE", 404);
  return row;
}
export function enqueue(
  runId: string | null,
  kind: PayrollJob["kind"],
  key: string,
  payload: unknown = {},
  availableAt?: string,
) {
  return q(
    `INSERT INTO payroll_jobs(id,workspace_id,run_id,kind,business_key,payload,available_at) VALUES($1::uuid,${ws},$2::uuid,$3,$4,$5::jsonb,COALESCE($6::timestamptz,clock_timestamp())) ON CONFLICT(workspace_id,business_key) DO NOTHING`,
    randomUUID(),
    runId,
    kind,
    key,
    JSON.stringify(payload),
    availableAt ?? null,
  );
}
export function newRun(
  id: string,
  p: { startDate: string; endDate: string },
  payday: string,
  correctionOf: string | null = null,
): PayrollRun {
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
  return q(
    `INSERT INTO payroll_runs VALUES(${ws},$1::uuid,$2::date,$3::date,$4::uuid)`,
    r.id,
    r.period.startDate,
    r.period.endDate,
    r.correctionOf,
  );
}
export function insertRevision(r: PayrollRun, s: Snapshot | null) {
  return q(
    `INSERT INTO payroll_run_revisions VALUES(${ws},$1::uuid,$2,$3::jsonb,$4::jsonb)`,
    r.id,
    r.revision,
    JSON.stringify(r),
    s === null ? null : JSON.stringify(s),
  );
}
function revisionGuard(r: PayrollRun) {
  return check(
    `(SELECT revision FROM payroll_runs_current WHERE workspace_id=${ws} AND run_id=$1::uuid)=$2`,
    r.id,
    r.revision,
  );
}
function resolveSettings(s: Source, payday: string) {
  return s.settings
    .filter((r) => r.effectiveFrom <= payday)
    .sort(
      (a, b) =>
        b.effectiveFrom.localeCompare(a.effectiveFrom) ||
        b.revision - a.revision,
    )[0];
}
function resolveExceptions(s: Source, payday: string) {
  const result = new Map<string, PayrollExceptionRevision>();
  for (const e of [...s.exceptions]
    .filter((r) => r.effectiveFrom <= payday)
    .sort(
      (a, b) =>
        a.effectiveFrom.localeCompare(b.effectiveFrom) ||
        a.revision - b.revision,
    ))
    result.set(e.exception.employeeId, e);
  return [...result.values()];
}
function sourceGuard(
  s: Awaited<ReturnType<typeof source>>,
  r: PayrollRun,
  proof: SessionMutationProof,
) {
  return check(
    `${sourceSql}=$6::jsonb`,
    s.id,
    true,
    proof.employee.id,
    r.period.startDate,
    r.period.endDate,
    JSON.stringify(s.source),
  );
}
function importSnapshot(
  s: Awaited<ReturnType<typeof source>>,
  amounts: PayrollImport,
) {
  const settings = resolveSettings(s.source, amounts.payday);
  if (!settings) throw new PayrollError("SETTINGS_REQUIRED", 409);
  const population = s.source.population;
  if (
    !population ||
    population.members.length !== s.source.roster.length ||
    new Set(population.members.map((m) => m.employeeId)).size !==
      s.source.roster.length ||
    !s.source.roster.every((e) =>
      population.members.some((m) => m.employeeId === e.employeeId),
    )
  )
    throw new PayrollError("POPULATION_REVIEW_REQUIRED", 409);
  const periodSource = {
    roster: s.source.roster,
    timecards: s.source.timecards,
  };
  if (population.sourceHash !== hash(periodSource))
    throw new PayrollError("POPULATION_SOURCE_CONFLICT", 409);
  const cards = parseTimecardsResponse(
    { ...s.source.timecards, observedAt: s.observed },
    amounts.period,
  ).cards;
  const failures: string[] = [];
  for (const member of population.members) {
    const card = cards.find((c) => c.card.employeeId === member.employeeId);
    const row = amounts.rows.find((r) => r.employeeId === member.employeeId)!;
    if (member.disposition === "INCLUDE" && card?.state !== "FINALIZED")
      failures.push(`TIME_NOT_FINALIZED:${member.employeeId}`);
    if (
      member.disposition !== "INCLUDE" &&
      (row.grossMinor !== "0" ||
        row.netMinor !== "0" ||
        row.employerContributions.some((l) => l.amountMinor !== "0"))
    )
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
export async function command(
  proof: SessionMutationProof,
  input: unknown,
  ex: SqlExecutor = neonNotificationExecutor(),
): Promise<PayrollReceipt> {
  enabled();
  const c = parseRunCommand(input);
  const permission =
    c.action === "APPROVE" ||
    c.action === "PUBLISH" ||
    c.action === "PAYMENT_EXPORT" ||
    c.action === "RETRY_JOB"
      ? "APPROVE"
      : "REVIEW";
  await guarded(proof, permission, q("SELECT 1"), ex);
  const saved = await replay(proof, c, ex);
  if (saved) return saved;
  if (c.action === "PREPARE") {
    const existing = await guarded<{ payload: PayrollRun }>(
      proof,
      "REVIEW",
      q(
        `SELECT c.payload FROM payroll_runs r JOIN payroll_runs_current c ON c.workspace_id=r.workspace_id AND c.run_id=r.id WHERE r.workspace_id=${ws} AND start_date=$1::date AND end_date=$2::date AND correction_of IS NULL`,
        c.period.startDate,
        c.period.endDate,
      ),
      ex,
    );
    if (existing[0] && existing[0].payload.payday !== c.payday)
      throw new PayrollError("PAYDAY_CONFLICT", 409);
    if (existing[0])
      return commit(
        proof,
        "REVIEW",
        c,
        {
          operationId: c.operationId,
          action: c.action,
          runId: existing[0].payload.id,
          revision: existing[0].payload.revision,
        },
        [],
        ex,
      );
    const r = newRun(c.operationId, c.period, c.payday);
    try {
      return await commit(
        proof,
        "REVIEW",
        c,
        {
          operationId: c.operationId,
          action: c.action,
          runId: r.id,
          revision: 1,
        },
        [insertRun(r), insertRevision(r, null)],
        ex,
      );
    } catch (error) {
      const retry = await replay(proof, c, ex);
      if (retry) return retry;
      const winner = await guarded<{
        id: string;
        revision: number;
        payday: string;
      }>(
        proof,
        "REVIEW",
        q(
          `SELECT r.id::text,c.revision,c.payload->>'payday' AS payday FROM payroll_runs r JOIN payroll_runs_current c ON c.workspace_id=r.workspace_id AND c.run_id=r.id WHERE r.workspace_id=${ws} AND r.start_date=$1::date AND r.end_date=$2::date AND r.correction_of IS NULL`,
          c.period.startDate,
          c.period.endDate,
        ),
        ex,
      );
      if (winner[0] && winner[0].payday !== c.payday)
        throw new PayrollError("PAYDAY_CONFLICT", 409);
      if (winner[0])
        return commit(
          proof,
          "REVIEW",
          c,
          {
            operationId: c.operationId,
            action: c.action,
            runId: winner[0].id,
            revision: winner[0].revision,
          },
          [],
          ex,
        );
      throw error;
    }
  }
  if (c.action === "RETRY_JOB")
    return commit(
      proof,
      "APPROVE",
      c,
      { operationId: c.operationId, action: c.action, jobId: c.jobId },
      [
        check(
          `EXISTS(SELECT 1 FROM payroll_jobs WHERE workspace_id=${ws} AND id=$1::uuid AND status='FAILED')`,
          c.jobId,
        ),
        q(
          `UPDATE payroll_jobs SET status='PENDING',attempts=0,error=NULL,available_at=clock_timestamp(),lease_token=NULL,lease_until=NULL WHERE workspace_id=${ws} AND id=$1::uuid`,
          c.jobId,
        ),
      ],
      ex,
    );
  const current = await readRun(proof, c.runId, ex),
    r = current.payload;
  if (r.revision !== c.expectedRevision)
    throw new PayrollError("REVISION_CONFLICT", 409);
  let next: PayrollRun,
    stmts: SqlStatement[],
    snapshot = current.snapshot;
  if (c.action === "IMPORT" || c.action === "CORRECT") {
    if (
      (c.action === "IMPORT" && r.status === "APPROVED") ||
      (c.action === "CORRECT" && r.status !== "APPROVED")
    )
      throw new PayrollError("RUN_STATE_CONFLICT", 409);
    const s = await source(proof, r.period, ex);
    const amounts = parseImport(
      c.amounts,
      s.source.roster.map((e) => e.employeeId),
    );
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
        employeeName: s.source.roster.find(
          (e) => e.employeeId === row.employeeId,
        )!.name,
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
  } else if (c.action === "APPROVE") {
    if (
      r.status !== "REVIEW_REQUIRED" ||
      !snapshot ||
      !r.reviewToken ||
      r.reviewToken !== c.reviewToken
    )
      throw new PayrollError("REVIEW_CONFLICT", 409);
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
  } else {
    if (r.status !== "APPROVED" || !snapshot)
      throw new PayrollError("APPROVAL_REQUIRED", 409);
    next = r;
    if (c.action === "PAYMENT_EXPORT") {
      const { paymentDocument } = await import("./documents");
      const doc = paymentDocument(r, snapshot);
      stmts = [revisionGuard(r), doc.statement];
      return commit(
        proof,
        "APPROVE",
        c,
        {
          operationId: c.operationId,
          action: c.action,
          runId: r.id,
          revision: r.revision,
          documentId: doc.id,
        },
        stmts,
        ex,
      );
    }
    stmts = [revisionGuard(r), enqueue(r.id, "PUBLISH", `publish:${r.id}`)];
  }
  return commit(
    proof,
    permission,
    c,
    {
      operationId: c.operationId,
      action: c.action,
      runId: next.id,
      revision: next.revision,
    },
    stmts,
    ex,
  );
}
/** Safe layout projection: disabled flag never queries payroll tables. */
export function payrollFeatureEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.NEVORA_PAYROLL_ENABLED === "true";
}
export async function readPayrollCapabilities(
  proof: SessionMutationProof,
  executor: SqlExecutor = neonNotificationExecutor(),
): Promise<PayrollCapabilities> {
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
