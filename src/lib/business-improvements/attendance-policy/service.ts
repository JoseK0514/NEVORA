import { createHash, randomUUID } from "node:crypto";
import type { SessionMutationProof } from "../../shift-changes/types";
import type { SqlExecutor } from "../../notifications/types";
import { neonNotificationExecutor } from "../../data/notification-transactions";
import { getWorkspace, workspaceReadGuard } from "../../data/workspaces";
import {
  assertManagementProof,
  managementSessionStatements,
} from "../../data/management-session";
import { sourceSql } from "../../data/attendance-review.server";
import type { AttendanceSource } from "../../attendance/types";
import { validateAttendanceSource } from "../../attendance/validation";
import {
  attendancePolicyProjection,
  type PolicyRevision,
} from "../company-policies/service";
import { projectPolicyRuntime, type PolicyRuntime } from "./runtime";
import { stableExportJson } from "../../payroll-export/json";
const runtimeSql = `/* attendance_policy_runtime */ WITH observed AS MATERIALIZED(SELECT clock_timestamp() AS at),
 raw AS MATERIALIZED(SELECT t.* FROM time_entries t JOIN locations l ON l.id=t.location_id JOIN employees e ON e.id=t.employee_id CROSS JOIN observed o WHERE l.workspace_id=$1 AND (t.clock_out_at IS NULL OR t.clock_out_at>=o.at-interval '8 days' OR t.clock_in_at>=o.at-interval '8 days') ORDER BY t.clock_in_at,t.id LIMIT 10001),
 effective AS MATERIALIZED(SELECT v.* FROM nevora_effective_time_entries v JOIN locations l ON l.id=v.location_id JOIN employees e ON e.id=v.employee_id CROSS JOIN observed o WHERE l.workspace_id=$1 AND (v.end_at IS NULL OR v.end_at>=o.at-interval '8 days' OR v.start_at>=o.at-interval '8 days') ORDER BY v.start_at,COALESCE(v.time_entry_id,v.adjustment_id::text) LIMIT 10001),
 latest AS MATERIALIZED(SELECT DISTINCT ON(r.week_start) r.id,r.week_start FROM schedule_publication_revisions r ORDER BY r.week_start,r.revision_number DESC),
 census AS MATERIALIZED(SELECT sh.* FROM schedule_publication_revision_shifts sh JOIN latest r ON r.id=sh.revision_id JOIN schedules s ON s.id=sh.schedule_id AND s.status='PUBLISHED' JOIN locations l ON l.id=sh.location_id JOIN employees e ON e.id=sh.employee_id AND e.active CROSS JOIN observed o WHERE l.workspace_id=$1 AND sh.date BETWEEN (o.at AT TIME ZONE $3)::date-1 AND (o.at AT TIME ZONE $3)::date ORDER BY sh.date,sh.id LIMIT 10001)
 SELECT o.at::text AS "observedAt",(SELECT expires_at::text FROM employee_sessions WHERE token_hash=$2) AS "expiresAt",
 COALESCE((SELECT jsonb_agg(id ORDER BY id) FROM(SELECT id FROM locations WHERE workspace_id=$1 AND active ORDER BY id LIMIT 101)l),'[]'::jsonb) AS locations,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('id',e.id,'name',trim(e.first_name||' '||e.last_name)) ORDER BY e.id) FROM employees e WHERE (e.id IN(SELECT employee_id FROM raw) OR e.id IN(SELECT employee_id FROM census))),'[]'::jsonb) AS "employeeLabels",
 COALESCE((SELECT jsonb_agg(jsonb_build_object('id',l.id,'name',l.short_name) ORDER BY l.id) FROM locations l WHERE l.workspace_id=$1 AND l.active),'[]'::jsonb) AS "locationLabels",
 COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'employeeId',employee_id,'locationId',location_id,'startAt',clock_in_at::text,'endAt',clock_out_at::text,'version',version::text,'scheduleContext',schedule_context) ORDER BY clock_in_at,id) FROM raw),'[]'::jsonb) AS raw,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('id',COALESCE(v.time_entry_id,v.adjustment_id::text),'employeeId',v.employee_id,'locationId',v.location_id,'startAt',v.start_at::text,'endAt',v.end_at::text,'version',concat_ws(':',v.recorded_version,v.adjustment_id,a.source_revision),'scheduleContext',t.schedule_context) ORDER BY v.start_at,COALESCE(v.time_entry_id,v.adjustment_id::text)) FROM effective v LEFT JOIN time_entries t ON t.id=v.time_entry_id LEFT JOIN time_correction_adjustments a ON a.id=v.adjustment_id),'[]'::jsonb) AS effective,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'employeeId',employee_id,'locationId',location_id,'revisionId',revision_id,'date',date::text,'startTime',start_time::text,'endTime',end_time::text,'callout',is_callout_approved) ORDER BY date,id) FROM census),'[]'::jsonb) AS census,
 (SELECT count(*)<=10000 FROM raw) AND (SELECT count(*)<=10000 FROM effective) AND (SELECT count(*)<=10000 FROM census) AS complete,
 NOT EXISTS(SELECT 1 FROM schedules s JOIN locations l ON l.id=s.location_id WHERE l.workspace_id=$1 AND s.status='PUBLISHED' AND s.week_start=date_trunc('week',o.at AT TIME ZONE $3)::date AND NOT EXISTS(SELECT 1 FROM latest r WHERE r.week_start=s.week_start)) AS "censusComplete" FROM observed o`;

// Preserve absent (inherit) versus stored JSON null (unconfigure) while
// projecting only the management-authorized overtime rule from private Labor.
const policySql = `SELECT DISTINCT ON(COALESCE(location_id,'')) location_id AS "locationId",revision,
 jsonb_build_object('version',1,'attendance',COALESCE(settings->'attendance','{}'::jsonb),'labor',
  CASE WHEN (settings->'labor') ? 'overtimeRisk'
   THEN jsonb_build_object('overtimeRisk',settings#>'{labor,overtimeRisk}') ELSE '{}'::jsonb END) AS settings
 FROM nevora_company_policy_revisions WHERE workspace_id=$1 ORDER BY COALESCE(location_id,''),revision DESC`;
const hash = (v: unknown) =>
  createHash("sha256").update(stableExportJson(v)).digest("hex");
function normalizedSource(value: Record<string, unknown>) {
  const output = { ...value };
  delete output.observedAt;
  delete output.expiresAt;
  output.source = { ...(value.source as object) };
  delete (output.source as Record<string, unknown>).observedAt;
  return output;
}
function normalizedRuntime(value: Record<string, unknown>) {
  const output = { ...value };
  delete output.observedAt;
  delete output.expiresAt;
  return output;
}
export async function readAttendancePolicies(
  proof: SessionMutationProof,
  executor: SqlExecutor = neonNotificationExecutor(),
) {
  try {
    assertManagementProof(proof, proof.employee.id);
    const started = performance.now(),
      workspace = await getWorkspace(executor);
    const values = [workspace.id, proof.sessionTokenHash, workspace.timeZone];
    const guards = [
      ...workspaceReadGuard(workspace),
      {
        text: "LOCK TABLE employees,locations,schedules,schedule_publication_revisions,schedule_publication_revision_shifts,time_entries,break_entries,time_correction_adjustments,time_correction_requests,time_correction_events,nevora_company_policy_revisions IN SHARE MODE",
        values: [],
      },
      ...managementSessionStatements(proof, proof.employee.id),
    ];
    const read = await executor.transaction([
      ...guards,
      { text: sourceSql, values },
      { text: runtimeSql, values },
      { text: policySql, values: [workspace.id] },
      ...managementSessionStatements(proof, proof.employee.id),
    ]);
    const sourceRow = read[guards.length]?.[0] as Record<string, unknown>,
      runtime = read[guards.length + 1]?.[0] as PolicyRuntime & {
        expiresAt: string;
        employeeLabels: { id: string; name: string }[];
        locationLabels: { id: string; name: string }[];
      },
      policies = read[guards.length + 2] as PolicyRevision[];
    if (
      !sourceRow ||
      !runtime ||
      !runtime.complete ||
      Number(sourceRow.entryCount) > 500 ||
      Number(sourceRow.breakCount) > 5000 ||
      Number(sourceRow.publicationCount) > 500
    )
      return { state: "unavailable" as const, reason: "source_limit" };
    const source = sourceRow.source as AttendanceSource;
    const validated = validateAttendanceSource(source);
    if ("state" in validated && validated.state === "unavailable") return validated;
    const result = projectPolicyRuntime(
      source,
      runtime.locations.map((id) => attendancePolicyProjection(policies, id)),
      runtime,
    );
    if (result.state !== "ready") return result;
    const snapshot = {
      ...result,
      labels: {
        employees: runtime.employeeLabels,
        locations: runtime.locationLabels,
      },
      sourceHash: hash([
        normalizedSource(sourceRow),
        normalizedRuntime(runtime),
        policies,
      ]),
      observationId: randomUUID(),
    };
    const remaining =
      Math.min(
        45000,
        Date.parse(runtime.expiresAt) - Date.parse(runtime.observedAt),
      ) - Math.ceil(performance.now() - started);
    if (remaining <= 0)
      return { state: "unavailable" as const, reason: "access_denied" };
    await executor.transaction([
      ...guards,
      {
        text: `SELECT (CASE WHEN (SELECT (to_jsonb(s)-'observedAt'-'expiresAt') || jsonb_build_object('source',s.source-'observedAt') FROM (${sourceSql}) s)=$4::jsonb THEN '1' ELSE 'attendance_source_changed' END)::integer`,
        values: [...values, JSON.stringify(normalizedSource(sourceRow))],
      },
      {
        text: `SELECT (CASE WHEN (SELECT to_jsonb(s)-'observedAt'-'expiresAt' FROM (${runtimeSql}) s)=$4::jsonb THEN '1' ELSE 'attendance_source_changed' END)::integer`,
        values: [...values, JSON.stringify(normalizedRuntime(runtime))],
      },
      {
        text: `SELECT (CASE WHEN (SELECT COALESCE(jsonb_agg(s),'[]'::jsonb) FROM (${policySql}) s)=$2::jsonb THEN '1' ELSE 'attendance_source_changed' END)::integer`,
        values: [workspace.id, JSON.stringify(policies)],
      },
      {
        text: "INSERT INTO attendance_policy_observations(id,workspace_id,actor_employee_id,payload) VALUES($1::uuid,$2,$3,$4::jsonb)",
        values: [
          snapshot.observationId,
          workspace.id,
          proof.employee.id,
          JSON.stringify(snapshot),
        ],
      },
      ...managementSessionStatements(proof, proof.employee.id),
    ]);
    return {
      ...snapshot,
      validForMs: Math.max(
        0,
        remaining - Math.ceil(performance.now() - started),
      ),
    };
  } catch {
    return {
      state: "unavailable" as const,
      reason: "source_changed_or_unavailable",
    };
  }
}
