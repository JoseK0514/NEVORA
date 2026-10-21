import { createHash } from "node:crypto";
import { stableExportJson } from "../payroll-export/json";
import type { SqlExecutor, SqlStatement } from "../notifications/types";
import type { SessionMutationProof } from "../shift-changes/types";
import { assertManagementProof, managementSessionStatements, } from "../data/management-session";
import { PayrollError } from "./model";
import { compatibleManagerScopeSql } from "./native/scope";
export const hash = (v: unknown) => createHash("sha256").update(stableExportJson(v)).digest("hex");
export const statement = (text: string, ...values: unknown[]): SqlStatement => ({ text, values });
export function enabled() {
    if (process.env.NEVORA_PAYROLL_ENABLED !== "true")
        throw new PayrollError("PAYROLL_DISABLED", 503);
}
export const locks = () => [
    statement("SELECT id FROM workspaces WHERE singleton=true ORDER BY id FOR NO KEY UPDATE"),
    statement("LOCK TABLE employees IN SHARE ROW EXCLUSIVE MODE"),
    statement("SELECT id FROM employees ORDER BY id FOR UPDATE"),
    statement("LOCK TABLE locations IN SHARE MODE"),
    statement("LOCK TABLE time_entries,break_entries,time_correction_adjustments,time_correction_requests,time_correction_events,timecard_revisions,payroll_export_receipts,payroll_export_profile_revisions,payroll_period_populations,payroll_period_manifests,payroll_setting_revisions,payroll_exception_revisions,payroll_grant_revisions,payroll_runs,payroll_run_revisions IN SHARE MODE"),
    statement("DO $$ BEGIN IF to_regclass('native_payroll_ledger') IS NOT NULL THEN LOCK TABLE native_payroll_profile_revisions,native_payroll_opening_ytd_revisions,native_payroll_manager_scope_revisions,native_payroll_ledger,native_payroll_document_manifests IN SHARE MODE; END IF; END $$"),
];
export function authority(proof: SessionMutationProof, permission: "OWNER" | "REVIEW" | "APPROVE" | "SELF"): SqlStatement[] {
    assertManagementProof(proof, proof.employee.id);
    const manager = proof.employee.role === "MANAGER" ? compatibleManagerScopeSql("$1", "w.id", permission === "APPROVE" ? "approve" : "review") : "false";
    return [
        ...managementSessionStatements(proof, proof.employee.id, [
            "OWNER",
            "MANAGER",
            "LEAD",
            "EMPLOYEE",
        ]),
        statement(`SELECT (CASE WHEN EXISTS(SELECT 1 FROM employees e JOIN locations l ON l.id=e.primary_location_id JOIN workspaces w ON w.id=l.workspace_id WHERE w.singleton AND w.active AND e.id=$1 AND e.active AND ($2='SELF' OR e.role='OWNER' OR ($2 IN('REVIEW','APPROVE') AND e.role='MANAGER' AND ${manager}))) THEN '1' ELSE 'payroll_authorization' END)::integer`, proof.employee.id, permission),
    ];
}
export async function guarded<T>(proof: SessionMutationProof, permission: "OWNER" | "REVIEW" | "APPROVE" | "SELF", query: SqlStatement, executor: SqlExecutor): Promise<T[]> {
    enabled();
    const first = [...locks(), ...authority(proof, permission)];
    const result = await executor.transaction([
        ...first,
        query,
        ...authority(proof, permission),
    ]);
    return result[first.length] as T[];
}
export const workspaceSql = "(SELECT id FROM workspaces WHERE singleton AND active)";
