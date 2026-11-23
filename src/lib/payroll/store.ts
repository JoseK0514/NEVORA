import {readFeatureFlags} from '../feature-flags';
import {workspaceMode} from '../workspace-routing/config.server';
import {sourceTableLock} from '../data/source-table-lock';
/**
 * Shared payroll SQL guards. Authority is checked against the current database
 * session/role, with locks and a second check around protected work. These helpers
 * produce statements; callers must preserve their order in one transaction.
 */
import { createHash } from "node:crypto";
import { stableExportJson } from "../payroll-export/json";
import type { SqlExecutor, SqlStatement } from "../notifications/types";
import type { SessionMutationProof } from "../shift-changes/types";
import { assertManagementProof, managementSessionCheck, managementSessionStatements, } from "../data/management-session";
import { readTransaction } from "../data/transaction-composition";
import { PayrollError } from "./model";
import { compatibleManagerScopeSql } from "./native/scope";
export const hash = (v: unknown) => createHash("sha256").update(stableExportJson(v)).digest("hex");
export const statement = (text: string, ...values: unknown[]): SqlStatement => ({ text, values });
export function enabled() {
    if (!readFeatureFlags(process.env).payroll)
        throw new PayrollError("PAYROLL_DISABLED", 503);
}
export const locks = () => [
    statement("SELECT id FROM workspaces WHERE singleton=true ORDER BY id FOR NO KEY UPDATE"),
    sourceTableLock(['employees'],'SHARE ROW EXCLUSIVE'),
    statement("SELECT id FROM employees ORDER BY id FOR UPDATE"),
    sourceTableLock(['locations'],'SHARE'),
    sourceTableLock('time_entries,break_entries,time_correction_adjustments,time_correction_requests,time_correction_events,timecard_revisions,payroll_export_receipts,payroll_export_profile_revisions,payroll_period_populations,payroll_period_manifests,payroll_setting_revisions,payroll_exception_revisions,payroll_grant_revisions,payroll_runs,payroll_run_revisions'.split(','),'SHARE'),
    ...(workspaceMode()==='isolated'?[sourceTableLock('native_payroll_profile_revisions,native_payroll_opening_ytd_revisions,native_payroll_manager_scope_revisions,native_payroll_ledger,native_payroll_document_manifests'.split(','),'SHARE')]:[statement("DO $$ BEGIN IF to_regclass('native_payroll_ledger') IS NOT NULL THEN LOCK TABLE native_payroll_profile_revisions,native_payroll_opening_ytd_revisions,native_payroll_manager_scope_revisions,native_payroll_ledger,native_payroll_document_manifests IN SHARE MODE; END IF; END $$")]),
];
type Permission = "OWNER" | "REVIEW" | "APPROVE" | "SELF";
const sessionRoles = ["OWNER", "MANAGER", "LEAD", "EMPLOYEE"] as const;
function authorityCheck(proof: SessionMutationProof, permission: Permission): SqlStatement {
    const manager = proof.employee.role === "MANAGER" ? compatibleManagerScopeSql("$1", "w.id", permission === "APPROVE" ? "approve" : "review") : "false";
    return statement(`SELECT (CASE WHEN EXISTS(SELECT 1 FROM employees e JOIN locations l ON l.id=e.primary_location_id JOIN workspaces w ON w.id=l.workspace_id WHERE w.singleton AND w.active AND e.id=$1 AND e.active AND ($2='SELF' OR e.role='OWNER' OR ($2 IN('REVIEW','APPROVE') AND e.role='MANAGER' AND ${manager}))) THEN '1' ELSE 'payroll_authorization' END)::integer`, proof.employee.id, permission);
}
export function authority(proof: SessionMutationProof, permission: Permission): SqlStatement[] {
    assertManagementProof(proof, proof.employee.id);
    return [
        ...managementSessionStatements(proof, proof.employee.id, sessionRoles),
        authorityCheck(proof, permission),
    ];
}
/** authority() without the session row lock: the same two checks, in the same
 * order, for snapshotRead only. */
function readAuthority(proof: SessionMutationProof, permission: Permission): SqlStatement[] {
    assertManagementProof(proof, proof.employee.id);
    return [managementSessionCheck(proof, proof.employee.id, sessionRoles), authorityCheck(proof, permission)];
}
/** Feature-gated read/write envelope. SELF proves an active session but does not
 * restrict which payroll object the supplied query reads; the query must add its
 * own employee, publication and/or location-coverage predicate. */
export async function guarded<T>(proof: SessionMutationProof, permission: Permission, query: SqlStatement, executor: SqlExecutor): Promise<T[]> {
    enabled();
    const first = [...locks(), ...authority(proof, permission)];
    const result = await executor.transaction([
        ...first,
        query,
        ...authority(proof, permission),
    ]);
    return result[first.length] as T[];
}
/** Lock-free read envelope for display-only projections, such as the capability
 * flags every /app page load reads. QA A3-07 (Nov 21, 2026): reading them through
 * guarded() took locks() on every load, so loads queued behind each other and
 * behind payroll writers (276 lock waits in 32 s for one user, up to 914 ms with
 * three tabs, all 28 traced timeouts).
 *
 * A read needs none of those locks. locks() keeps a writer's sources unchanged
 * until it commits and serializes writers against each other; a read commits
 * nothing, so there is nothing to keep stable. Plain SELECTs read committed MVCC
 * snapshots: they never wait on a writer's FOR UPDATE / SHARE locks and never
 * make a writer wait. The session and payroll authority checks are the same
 * statements guarded() runs, before and after the query, so for unchanged data it
 * returns the same rows and throws the same errors as guarded(). If a writer
 * commits during the read, each statement sees committed data from before or
 * after that commit, and the closing checks still reject a session or role
 * revoked by then. Never feed its result into a write: every payroll mutation
 * re-checks authority under locks(). */
export async function snapshotRead<T>(proof: SessionMutationProof, permission: Permission, query: SqlStatement, executor: SqlExecutor): Promise<T[]> {
    enabled();
    const first = readAuthority(proof, permission);
    const result = await readTransaction(executor, [...first, query, ...readAuthority(proof, permission)]);
    return result[first.length] as T[];
}
export const workspaceSql = "(SELECT id FROM workspaces WHERE singleton AND active)";
