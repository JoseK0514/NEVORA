import type { SessionMutationProof } from "../../shift-changes/types";
// This is a query predicate, not a capability returned by a trusted client.
export function managerScopeSql(actor: string, workspace: string, permission: "review" | "approve") {
    return `EXISTS(SELECT 1 FROM native_payroll_manager_scopes_current g JOIN employees manager ON manager.id=g.employee_id WHERE g.workspace_id=${workspace} AND g.employee_id=${actor} AND manager.active AND manager.role='MANAGER' AND manager.updated_at::text=g.subject_employee_version AND g.payload->>'${permission}'='true' AND jsonb_array_length(g.payload->'locationIds')>0 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(g.payload->'locationIds') granted(id) WHERE NOT EXISTS(SELECT 1 FROM locations location WHERE location.id=granted.id AND location.workspace_id=g.workspace_id AND location.active)))`;
}
/** Native tables select the finite grant. Pre-adoption schemas retain their
 * existing current Manager grant; this never enables a native calculation. */
export function compatibleManagerScopeSql(actor: string, workspace: string, permission: "review" | "approve", coverage?: string) {
    const native = managerScopeSql("%1$L", "%2$L", permission) + (coverage ? ` AND %3$L::jsonb->>'complete'='true' AND jsonb_typeof(%3$L::jsonb->'locationIds')='array' AND jsonb_array_length(%3$L::jsonb->'locationIds')>0 AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(%3$L::jsonb->'locationIds') disclosed(id) WHERE NOT EXISTS(SELECT 1 FROM native_payroll_manager_scopes_current scope WHERE scope.workspace_id=%2$L AND scope.employee_id=%1$L AND scope.payload->'locationIds' ? disclosed.id))` : "");
    const legacy = `EXISTS(SELECT 1 FROM payroll_grants_current legacy_grant JOIN employees manager ON manager.id=legacy_grant.employee_id WHERE legacy_grant.workspace_id=${workspace} AND legacy_grant.employee_id=${actor} AND manager.active AND manager.role='MANAGER' AND legacy_grant.payload->>'${permission}'='true')`;
    // format %L quotes runtime identities/JSON; the dollar-quoted template is code.
    return `(CASE WHEN to_regclass('native_payroll_manager_scopes_current') IS NULL THEN ${legacy} ELSE COALESCE(((xpath('/table/row/permitted/text()',query_to_xml(format($native_payroll_scope$SELECT (${native}) AS permitted$native_payroll_scope$,${actor},${workspace}${coverage ? `,${coverage}` : ""}),false,false,'')))[1])::text::boolean,false) END)`;
}
export function payrollObjectScopeSql(proof: SessionMutationProof, coverage: string, workspace: string, permission: "review" | "approve" = "review", ownerOnly = false) {
    const actor = "'" + proof.employee.id.replaceAll("'", "''") + "'";
    const owner = `EXISTS(SELECT 1 FROM employees current_actor WHERE current_actor.id=${actor} AND current_actor.active AND current_actor.role='OWNER')`;
    if (ownerOnly || proof.employee.role !== "MANAGER")
        return owner;
    return `(${owner} OR ${compatibleManagerScopeSql(actor, workspace, permission, coverage)})`;
}
