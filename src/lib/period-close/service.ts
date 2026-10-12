import { createHash, randomUUID } from "node:crypto";
import type { SessionMutationProof } from "../shift-changes/types";
import type { SqlExecutor, SqlStatement } from "../notifications/types";
import { getWorkspace, workspaceReadGuard } from "../data/workspaces";
import {
  assertManagementProof,
  managementSessionStatements,
} from "../data/management-session";
import { neonNotificationExecutor } from "../data/notification-transactions";
import { timecardReadSql } from "../timecards/service";
import { parseTimecardsResponse } from "../timecards/read-model";
import { parsePeriod, type Period } from "../timecards/project";
import { stableExportJson } from "../payroll-export/json";
import type { PayrollExportPayload } from "../payroll-export/service";
const digest = (v: unknown) =>
  createHash("sha256").update(stableExportJson(v)).digest("hex");
const hashText = (v: string) => createHash("sha256").update(v).digest("hex");
const uuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
const text = (v: unknown): v is string =>
  typeof v === "string" &&
  v.trim() === v &&
  v.length > 0 &&
  v.length <= 600 &&
  !/[\u0000-\u001f\u007f]/.test(v);
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
export type MemberReview = {
  employeeId: string;
  disposition: "INCLUDE" | "ZERO_TIME" | "EXCLUDE";
  reason: string;
  employmentFacts: string;
  employmentBasis: "MANAGER_ATTESTED";
};
export type Population = {
  operationId: string;
  period: Period;
  revision: number;
  sourceHash: string;
  members: MemberReview[];
};
export type Manifest = {
  id: string;
  period: Period;
  population: Population;
  sourceHash: string;
  exportCustody: unknown;
  exports: {
    actorId: string;
    operationId: string;
    payload: PayrollExportPayload;
  }[];
  totals: { recordedNanoseconds: string; breakNanoseconds: string };
  state: "MANIFEST_PREPARED";
  downstream: "NOT_VERIFIED";
};
const periodSourceSql = `jsonb_build_object('roster',COALESCE((SELECT jsonb_agg(jsonb_build_object('employeeId',e.id,'name',trim(e.first_name||' '||e.last_name),'active',e.active,'locationId',e.primary_location_id) ORDER BY e.id COLLATE "C") FROM employees e),'[]'::jsonb),'timecards',(SELECT to_jsonb(t)-'observedAt' FROM (${timecardReadSql}) t))`;
// The complete receipt set and current mapping revisions are part of period custody.
// This also invalidates a prepared manifest when a later export batch is created.
const exportCustodySql = `COALESCE((SELECT jsonb_agg(jsonb_build_object('actorId',r.actor_employee_id,'operationId',r.operation_id,'csvSha256',r.payload->>'csvSha256','canonicalSha256',r.payload->>'canonicalSha256','profileId',r.payload->>'profileId','currentProfileRevision',p.revision) ORDER BY r.actor_employee_id,r.operation_id) FROM payroll_export_receipts r LEFT JOIN nevora_payroll_profile_latest p ON p.workspace_id=r.workspace_id AND p.profile_id::text=r.payload->>'profileId' WHERE r.workspace_id=$1 AND r.payload#>>'{model,period,startDate}'=$2 AND r.payload#>>'{model,period,endDate}'=$3),'[]'::jsonb)`;
function custodyGuard(
  workspaceId: string,
  period: Period,
  custody: unknown,
): SqlStatement {
  return {
    text: `SELECT (CASE WHEN ${exportCustodySql}=$4::jsonb THEN '1' ELSE 'EXPORT_CUSTODY_CONFLICT' END)::integer`,
    values: [
      workspaceId,
      period.startDate,
      period.endDate,
      JSON.stringify(custody),
    ],
  };
}
type Source = {
  roster: {
    employeeId: string;
    name: string;
    active: boolean;
    locationId: string;
  }[];
  timecards: { cards: unknown[] };
};
async function scope(proof: SessionMutationProof, executor: SqlExecutor) {
  assertManagementProof(proof, proof.employee.id);
  const workspace = await getWorkspace(executor);
  return {
    workspace,
    guards: [
      ...workspaceReadGuard(workspace),
      { text: "SELECT id FROM employees ORDER BY id FOR SHARE", values: [] },
      ...managementSessionStatements(proof, proof.employee.id),
    ],
  };
}
function periodValues(
  workspaceId: string,
  proof: SessionMutationProof,
  period: Period,
) {
  return [
    workspaceId,
    true,
    proof.employee.id,
    period.startDate,
    period.endDate,
  ];
}
async function read(
  proof: SessionMutationProof,
  requested: Period,
  executor: SqlExecutor,
) {
  const period = parsePeriod(requested.startDate, requested.endDate),
    { workspace, guards } = await scope(proof, executor),
    values = periodValues(workspace.id, proof, period);
  const result = await executor.transaction([
    ...guards,
    {
      text: `SELECT ${periodSourceSql} AS source,clock_timestamp()::text AS observed`,
      values,
    },
    {
      text: "SELECT payload FROM payroll_period_populations WHERE workspace_id=$1 AND start_date=$2 AND end_date=$3 ORDER BY revision DESC LIMIT 1",
      values: [workspace.id, period.startDate, period.endDate],
    },
    {
      text: `SELECT ${exportCustodySql} AS custody`,
      values: [workspace.id, period.startDate, period.endDate],
    },
    ...managementSessionStatements(proof, proof.employee.id),
  ]);
  const row = result[guards.length]?.[0] as {
    source: Source;
    observed: string;
  };
  if (!row || row.source.roster.length > 300)
    throw Error("POPULATION_SOURCE_LIMIT");
  const cards = parseTimecardsResponse(
    { ...row.source.timecards, observedAt: row.observed },
    period,
  ).cards;
  if (cards.length !== row.source.roster.length)
    throw Error("POPULATION_UNAVAILABLE");
  return {
    workspace,
    period,
    source: row.source,
    sourceHash: digest(row.source),
    exportCustody: (result[guards.length + 2]?.[0] as { custody: unknown })
      .custody,
    cards,
    population:
      (result[guards.length + 1]?.[0] as { payload: Population } | undefined)
        ?.payload ?? null,
  };
}
export async function readPeriodClose(
  proof: SessionMutationProof,
  period: Period,
  executor: SqlExecutor = neonNotificationExecutor(),
) {
  const state = await read(proof, period, executor),
    { guards } = await scope(proof, executor);
  const results = await executor.transaction([
    ...guards,
    {
      text: "SELECT id::text,payload,manifest_hash AS hash FROM payroll_period_manifests WHERE workspace_id=$1 AND start_date=$2 AND end_date=$3 ORDER BY created_at DESC",
      values: [
        state.workspace.id,
        state.period.startDate,
        state.period.endDate,
      ],
    },
    {
      text: "SELECT actor_employee_id AS \"actorId\",operation_id::text AS \"operationId\",payload FROM payroll_export_receipts WHERE workspace_id=$1 AND payload#>>'{model,period,startDate}'=$2 AND payload#>>'{model,period,endDate}'=$3 ORDER BY created_at",
      values: [
        state.workspace.id,
        state.period.startDate,
        state.period.endDate,
      ],
    },
    {
      text: 'SELECT e.manifest_id::text AS "manifestId",e.kind,e.payload,e.actor_employee_id AS "actorId",e.created_at::text AS "createdAt" FROM payroll_period_events e JOIN payroll_period_manifests m ON m.workspace_id=e.workspace_id AND m.id=e.manifest_id WHERE e.workspace_id=$1 AND m.start_date=$2 AND m.end_date=$3 ORDER BY e.created_at DESC LIMIT 1001',
      values: [
        state.workspace.id,
        state.period.startDate,
        state.period.endDate,
      ],
    },
    ...managementSessionStatements(proof, proof.employee.id),
  ]);
  const events = results[guards.length + 2] as {
    manifestId: string;
    kind: string;
    payload: {
      destination?: string;
      reference?: string;
      verification?: string;
      filename?: string;
      sha256?: string;
    };
    actorId: string;
    createdAt: string;
  }[];
  if (events.length > 1000) throw Error("PERIOD_EVENT_SOURCE_LIMIT");
  const manifests = results[guards.length] as {
      id: string;
      payload: Manifest;
      hash: string;
    }[],
    exports = results[guards.length + 1] as {
      actorId: string;
      operationId: string;
      payload: PayrollExportPayload;
    }[];
  return {
    period: state.period,
    sourceHash: state.sourceHash,
    population: state.population,
    members: state.source.roster.map((e) => {
      const card = state.cards.find((c) => c.card.employeeId === e.employeeId)!;
      return {
        ...e,
        employmentStart: null,
        employmentEnd: null,
        employmentBasis: "UNKNOWN" as const,
        cardState: card.state,
        recordedNanoseconds: card.card.recordedNanoseconds,
        breakNanoseconds: card.card.breakNanoseconds,
        hasPeriodEvidence:
          card.card.entries.length > 0 || card.history.length > 0,
        issues: card.card.issues,
        revision: card.revision,
      };
    }),
    manifests: manifests.map((m) => ({
      id: m.id,
      hash: m.hash,
      current:
        m.payload.sourceHash === state.sourceHash &&
        m.payload.population.revision === state.population?.revision &&
        digest(m.payload.exportCustody) === digest(state.exportCustody),
      populationRevision: m.payload.population.revision,
      totals: m.payload.totals,
      events: events.filter((e) => e.manifestId === m.id),
      exports: m.payload.exports.map((e, index) => ({
        index,
        operationId: e.operationId,
        csvSha256: e.payload.csvSha256,
        canonicalSha256: e.payload.canonicalSha256,
      })),
    })),
    exports: exports.map((e) => ({
      actorId: e.actorId,
      operationId: e.operationId,
      employeeIds: e.payload.model.rows.map((r) => r.employeeId),
      csvSha256: e.payload.csvSha256,
      profileName: e.payload.profile.name,
    })),
  };
}
function writeGuards(
  proof: SessionMutationProof,
  state: Awaited<ReturnType<typeof read>>,
): SqlStatement[] {
  return [
    {
      text: "SELECT id FROM workspaces WHERE singleton=true ORDER BY id FOR NO KEY UPDATE",
      values: [],
    },
    ...workspaceReadGuard(state.workspace),
    // SHARE ROW EXCLUSIVE prevents roster insertions as well as lifecycle changes;
    // employee locks are sorted and precede timecard/source locks.
    { text: "LOCK TABLE employees IN SHARE ROW EXCLUSIVE MODE", values: [] },
    { text: "SELECT id FROM employees ORDER BY id FOR UPDATE", values: [] },
    {
      text: "LOCK TABLE time_entries,break_entries,time_correction_adjustments,time_correction_requests,time_correction_events,timecard_revisions,payroll_export_receipts,payroll_export_profile_revisions,payroll_period_populations IN SHARE MODE",
      values: [],
    },
    ...managementSessionStatements(proof, proof.employee.id),
    {
      text: `SELECT (CASE WHEN ${periodSourceSql}=$6::jsonb THEN '1' ELSE 'PERIOD_SOURCE_CONFLICT' END)::integer`,
      values: [
        ...periodValues(state.workspace.id, proof, state.period),
        JSON.stringify(state.source),
      ],
    },
  ];
}
async function existing(
  proof: SessionMutationProof,
  operationId: string,
  table:
    | "payroll_period_populations"
    | "payroll_period_manifests"
    | "payroll_period_events",
  executor: SqlExecutor,
) {
  const { workspace, guards } = await scope(proof, executor),
    id = table === "payroll_period_populations" ? "operation_id" : "id";
  const result = await executor.transaction([
    ...guards,
    {
      text: `SELECT command_hash,payload,actor_employee_id FROM ${table} WHERE workspace_id=$1 AND ${id}=$2::uuid`,
      values: [workspace.id, operationId],
    },
    ...managementSessionStatements(proof, proof.employee.id),
  ]);
  return result[guards.length]?.[0] as
    | { command_hash: string; payload: unknown; actor_employee_id: string }
    | undefined;
}
function replay<T>(
  found: Awaited<ReturnType<typeof existing>>,
  proof: SessionMutationProof,
  hash: string,
): T | undefined {
  if (!found) return;
  if (
    found.actor_employee_id !== proof.employee.id ||
    found.command_hash !== hash
  )
    throw Error("COMMAND_CONFLICT");
  return found.payload as T;
}
export async function savePeriodPopulation(
  proof: SessionMutationProof,
  input: unknown,
  executor: SqlExecutor = neonNotificationExecutor(),
): Promise<Population> {
  if (
    !object(input) ||
    !uuid(input.operationId) ||
    !Number.isSafeInteger(input.expectedRevision) ||
    Number(input.expectedRevision) < 0 ||
    Number(input.expectedRevision) > 2147483646 ||
    typeof input.sourceHash !== "string" ||
    !Array.isArray(input.members) ||
    input.members.length > 300
  )
    throw Error("INVALID_POPULATION");
  const period = parsePeriod(String(input.startDate), String(input.endDate));
  const members = input.members
    .map((m): MemberReview => {
      if (
        !object(m) ||
        !text(m.employeeId) ||
        !["INCLUDE", "ZERO_TIME", "EXCLUDE"].includes(String(m.disposition)) ||
        !text(m.reason) ||
        !text(m.employmentFacts) ||
        m.employmentBasis !== "MANAGER_ATTESTED"
      )
        throw Error("Review every member disposition and employment facts");
      return {
        employeeId: m.employeeId,
        disposition: m.disposition as MemberReview["disposition"],
        reason: m.reason,
        employmentFacts: m.employmentFacts,
        employmentBasis: "MANAGER_ATTESTED",
      };
    })
    .sort((a, b) => a.employeeId.localeCompare(b.employeeId));
  const command = {
      operationId: input.operationId,
      expectedRevision: Number(input.expectedRevision),
      sourceHash: input.sourceHash,
      period,
      members,
    },
    hash = digest(command);
  const saved = replay<Population>(
    await existing(
      proof,
      command.operationId,
      "payroll_period_populations",
      executor,
    ),
    proof,
    hash,
  );
  if (saved) return saved;
  const state = await read(proof, period, executor);
  if (
    state.sourceHash !== command.sourceHash ||
    (state.population?.revision !== command.expectedRevision &&
      !(state.population === null && command.expectedRevision === 0))
  )
    throw Error("POPULATION_CONFLICT");
  if (
    digest(members.map((m) => m.employeeId).sort()) !==
    digest(state.source.roster.map((m) => m.employeeId).sort())
  )
    throw Error("POPULATION_OMISSION_DUPLICATE_OR_EXTRA");
  for (const member of members) {
    const card = state.cards.find(
      (c) => c.card.employeeId === member.employeeId,
    )!;
    if (
      member.disposition === "ZERO_TIME" &&
      (card.card.recordedNanoseconds !== "0" ||
        card.card.entries.length > 0 ||
        card.card.issues.length > 0)
    )
      throw Error("ZERO_TIME_REQUIRES_COMPLETE_EMPTY_EVIDENCE");
  }
  const payload: Population = {
    operationId: command.operationId,
    period,
    revision: command.expectedRevision + 1,
    sourceHash: state.sourceHash,
    members,
  };
  try {
    await executor.transaction([
      ...writeGuards(proof, state),
      {
        text: `SELECT (CASE WHEN COALESCE((SELECT max(revision) FROM payroll_period_populations WHERE workspace_id=$1 AND start_date=$2 AND end_date=$3),0)=$4 THEN '1' ELSE 'POPULATION_CONFLICT' END)::integer`,
        values: [
          state.workspace.id,
          period.startDate,
          period.endDate,
          command.expectedRevision,
        ],
      },
      {
        text: "INSERT INTO payroll_period_populations(workspace_id,start_date,end_date,revision,operation_id,actor_employee_id,command_hash,source_hash,payload) VALUES($1,$2,$3,$4,$5::uuid,$6,$7,$8,$9::jsonb)",
        values: [
          state.workspace.id,
          period.startDate,
          period.endDate,
          payload.revision,
          command.operationId,
          proof.employee.id,
          hash,
          state.sourceHash,
          JSON.stringify(payload),
        ],
      },
      ...managementSessionStatements(proof, proof.employee.id),
    ]);
    return payload;
  } catch (error) {
    const recovered = replay<Population>(
      await existing(
        proof,
        command.operationId,
        "payroll_period_populations",
        executor,
      ),
      proof,
      hash,
    );
    if (recovered) return recovered;
    throw error;
  }
}
export async function preparePeriodManifest(
  proof: SessionMutationProof,
  input: unknown,
  executor: SqlExecutor = neonNotificationExecutor(),
): Promise<Manifest> {
  if (
    !object(input) ||
    !uuid(input.operationId) ||
    !Number.isSafeInteger(input.populationRevision) ||
    !Array.isArray(input.receipts) ||
    input.receipts.length > 300
  )
    throw Error("INVALID_MANIFEST");
  const period = parsePeriod(String(input.startDate), String(input.endDate)),
    refs = input.receipts
      .map((r) => {
        if (!object(r) || !text(r.actorId) || !uuid(r.operationId))
          throw Error("INVALID_RECEIPT");
        return { actorId: r.actorId, operationId: r.operationId };
      })
      .sort((a, b) =>
        (a.actorId + a.operationId).localeCompare(b.actorId + b.operationId),
      );
  if (
    new Set(refs.map((r) => r.actorId + ":" + r.operationId)).size !==
    refs.length
  )
    throw Error("DUPLICATE_RECEIPT");
  const command = {
      operationId: input.operationId,
      period,
      populationRevision: Number(input.populationRevision),
      receipts: refs,
    },
    hash = digest(command),
    saved = replay<Manifest>(
      await existing(
        proof,
        command.operationId,
        "payroll_period_manifests",
        executor,
      ),
      proof,
      hash,
    );
  if (saved) return saved;
  const state = await read(proof, period, executor);
  if (
    !state.population ||
    state.population.revision !== command.populationRevision ||
    state.population.sourceHash !== state.sourceHash
  )
    throw Error("POPULATION_CONFLICT");
  const { guards } = await scope(proof, executor);
  const receipts = await executor.transaction([
    ...guards,
    ...refs.map((r) => ({
      text: "SELECT payload FROM payroll_export_receipts WHERE workspace_id=$1 AND actor_employee_id=$2 AND operation_id=$3::uuid",
      values: [state.workspace.id, r.actorId, r.operationId],
    })),
    ...managementSessionStatements(proof, proof.employee.id),
  ]);
  const exports = refs.map((r, i) => {
    const payload = (
      receipts[guards.length + i]?.[0] as
        | { payload: PayrollExportPayload }
        | undefined
    )?.payload;
    if (
      !payload ||
      digest(payload.model.period) !== digest(period) ||
      digest(payload.model) !== payload.canonicalSha256 ||
      hashText(payload.csv) !== payload.csvSha256
    )
      throw Error("MISSING_OR_WRONG_PERIOD_RECEIPT");
    return { ...r, payload };
  });
  const profileGuards: SqlStatement[] = exports
    .filter((e) => e.payload.profileId !== null)
    .map((e) => ({
      text: `SELECT (CASE WHEN EXISTS(SELECT 1 FROM nevora_payroll_profile_latest WHERE workspace_id=$1 AND profile_id=$2::uuid AND revision=$3) THEN '1' ELSE 'EXPORT_PROFILE_CONFLICT' END)::integer`,
      values: [
        state.workspace.id,
        e.payload.profileId,
        e.payload.profileRevision,
      ],
    }));
  const rows = exports.flatMap((e) => e.payload.model.rows),
    included = state.population.members
      .filter((m) => m.disposition === "INCLUDE")
      .map((m) => m.employeeId)
      .sort();
  if (digest(rows.map((r) => r.employeeId).sort()) !== digest(included))
    throw Error("EXPORT_OMISSION_DUPLICATE_OR_EXTRA");
  for (const row of rows) {
    const card = state.cards.find((c) => c.card.employeeId === row.employeeId);
    if (
      !card ||
      card.state !== "FINALIZED" ||
      row.revision !== card.revision ||
      row.sourceHash !== card.sourceHash ||
      row.finalizationOperationId !== card.history[0]?.operationId
    )
      throw Error("EXPORT_STALE_OR_REOPENED");
  }
  const manifest: Manifest = {
    id: command.operationId,
    period,
    population: state.population,
    sourceHash: state.sourceHash,
    exportCustody: state.exportCustody,
    exports,
    totals: {
      recordedNanoseconds: rows
        .reduce((sum, r) => sum + BigInt(r.recordedNanoseconds), BigInt(0))
        .toString(),
      breakNanoseconds: rows
        .reduce((sum, r) => sum + BigInt(r.breakNanoseconds), BigInt(0))
        .toString(),
    },
    state: "MANIFEST_PREPARED",
    downstream: "NOT_VERIFIED",
  };
  try {
    await executor.transaction([
      ...writeGuards(proof, state),
      ...profileGuards,
      custodyGuard(state.workspace.id, period, state.exportCustody),
      {
        text: "SELECT (CASE WHEN NOT EXISTS(SELECT 1 FROM payroll_period_manifests WHERE workspace_id=$1 AND start_date=$2 AND end_date=$3 AND population_revision=$4) THEN '1' ELSE 'MANIFEST_CONFLICT' END)::integer",
        values: [
          state.workspace.id,
          period.startDate,
          period.endDate,
          state.population.revision,
        ],
      },
      {
        text: `SELECT (CASE WHEN (SELECT max(revision) FROM payroll_period_populations WHERE workspace_id=$1 AND start_date=$2 AND end_date=$3)=$4 THEN '1' ELSE 'POPULATION_CONFLICT' END)::integer`,
        values: [
          state.workspace.id,
          period.startDate,
          period.endDate,
          state.population.revision,
        ],
      },
      {
        text: "INSERT INTO payroll_period_manifests(workspace_id,id,actor_employee_id,command_hash,start_date,end_date,population_revision,source_hash,manifest_hash,payload) VALUES($1,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)",
        values: [
          state.workspace.id,
          command.operationId,
          proof.employee.id,
          hash,
          period.startDate,
          period.endDate,
          state.population.revision,
          state.sourceHash,
          digest(manifest),
          JSON.stringify(manifest),
        ],
      },
      ...managementSessionStatements(proof, proof.employee.id),
    ]);
    return manifest;
  } catch (error) {
    const recovered = replay<Manifest>(
      await existing(
        proof,
        command.operationId,
        "payroll_period_manifests",
        executor,
      ),
      proof,
      hash,
    );
    if (recovered) return recovered;
    throw error;
  }
}
export async function readPeriodArtifact(
  proof: SessionMutationProof,
  id: string,
  format: "manifest" | "csv" | "canonical",
  index: number,
  executor: SqlExecutor = neonNotificationExecutor(),
) {
  if (!uuid(id) || !Number.isSafeInteger(index) || index < 0)
    throw Error("INVALID_ARTIFACT");
  const { workspace, guards } = await scope(proof, executor);
  const read = await executor.transaction([
    ...guards,
    {
      text: "SELECT payload,manifest_hash FROM payroll_period_manifests WHERE workspace_id=$1 AND id=$2::uuid",
      values: [workspace.id, id],
    },
    ...managementSessionStatements(proof, proof.employee.id),
  ]);
  const row = read[guards.length]?.[0] as
    | { payload: Manifest; manifest_hash: string }
    | undefined;
  if (!row || digest(row.payload) !== row.manifest_hash)
    throw Error("ARTIFACT_UNAVAILABLE");
  const receipt = row.payload.exports[index]?.payload;
  if (format !== "manifest" && !receipt) throw Error("ARTIFACT_UNAVAILABLE");
  const content =
    format === "manifest"
      ? stableExportJson(row.payload)
      : format === "csv"
        ? receipt!.csv
        : stableExportJson(receipt!.model);
  const sha256 = hashText(content),
    filename = `nevora-${row.payload.period.startDate}-${id}-${format}${format === "manifest" ? "" : `-${index}`}.${format === "csv" ? "csv" : "json"}`;
  await executor.transaction([
    ...guards,
    {
      text: "INSERT INTO payroll_period_events(workspace_id,manifest_id,id,actor_employee_id,kind,command_hash,payload) VALUES($1,$2::uuid,$3::uuid,$4,'ARTIFACT_SERVED',$5,$6::jsonb)",
      values: [
        workspace.id,
        id,
        randomUUID(),
        proof.employee.id,
        sha256,
        JSON.stringify({
          format,
          index,
          sha256,
          filename,
          evidence: "SERVER_RESPONSE_PREPARED",
          browserFilesystemCompletion: "UNVERIFIED",
        }),
      ],
    },
    ...managementSessionStatements(proof, proof.employee.id),
  ]);
  return {
    content,
    sha256,
    filename,
    contentType:
      format === "csv" ? "text/csv;charset=utf-8" : "application/json",
  };
}
export async function recordPeriodHandoff(
  proof: SessionMutationProof,
  input: unknown,
  executor: SqlExecutor = neonNotificationExecutor(),
) {
  if (
    !object(input) ||
    !uuid(input.operationId) ||
    !uuid(input.manifestId) ||
    !text(input.destination) ||
    !text(input.reference) ||
    !["REPORTED_SUBMITTED", "REPORTED_IMPORTED"].includes(String(input.kind))
  )
    throw Error("INVALID_HANDOFF");
  const command = {
      operationId: input.operationId,
      manifestId: input.manifestId,
      destination: input.destination,
      reference: input.reference,
      kind: String(input.kind),
    },
    hash = digest(command),
    saved = replay<object>(
      await existing(
        proof,
        command.operationId,
        "payroll_period_events",
        executor,
      ),
      proof,
      hash,
    );
  if (saved) return saved;
  const { workspace, guards } = await scope(proof, executor);
  const result = await executor.transaction([
    ...guards,
    {
      text: "SELECT payload,manifest_hash FROM payroll_period_manifests WHERE workspace_id=$1 AND id=$2::uuid",
      values: [workspace.id, command.manifestId],
    },
    ...managementSessionStatements(proof, proof.employee.id),
  ]);
  const manifest = result[guards.length]?.[0] as
    | { payload: Manifest; manifest_hash: string }
    | undefined;
  if (!manifest || digest(manifest.payload) !== manifest.manifest_hash)
    throw Error("MANIFEST_UNAVAILABLE");
  const current = await read(proof, manifest.payload.period, executor);
  if (
    current.sourceHash !== manifest.payload.sourceHash ||
    current.population?.revision !== manifest.payload.population.revision ||
    digest(current.exportCustody) !== digest(manifest.payload.exportCustody)
  )
    throw Error("HANDOFF_SOURCE_CONFLICT");
  const payload = {
    ...command,
    actorId: proof.employee.id,
    manifestSha256: manifest.manifest_hash,
    artifactHashes: manifest.payload.exports.map((e) => e.payload.csvSha256),
    verification: "MANAGER_REPORTED_ONLY",
    providerVerified: false,
    payrollProcessed: "UNVERIFIED",
  };
  try {
    await executor.transaction([
      ...writeGuards(proof, current),
      custodyGuard(
        workspace.id,
        current.period,
        manifest.payload.exportCustody,
      ),
      {
        text: `SELECT (CASE WHEN (SELECT max(revision) FROM payroll_period_populations WHERE workspace_id=$1 AND start_date=$2 AND end_date=$3)=$4 THEN '1' ELSE 'HANDOFF_SOURCE_CONFLICT' END)::integer`,
        values: [
          workspace.id,
          current.period.startDate,
          current.period.endDate,
          manifest.payload.population.revision,
        ],
      },
      {
        text: "INSERT INTO payroll_period_events(workspace_id,manifest_id,id,actor_employee_id,kind,command_hash,payload) VALUES($1,$2::uuid,$3::uuid,$4,$5,$6,$7::jsonb)",
        values: [
          workspace.id,
          command.manifestId,
          command.operationId,
          proof.employee.id,
          command.kind,
          hash,
          JSON.stringify(payload),
        ],
      },
      ...managementSessionStatements(proof, proof.employee.id),
    ]);
    return payload;
  } catch (error) {
    const recovered = replay<object>(
      await existing(
        proof,
        command.operationId,
        "payroll_period_events",
        executor,
      ),
      proof,
      hash,
    );
    if (recovered) return recovered;
    throw error;
  }
}
