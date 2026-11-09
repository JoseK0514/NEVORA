import "server-only";
import type { SqlExecutor, SqlStatement } from "../../notifications/types";
import type { SessionMutationProof } from "../../shift-changes/types";
import { neonNotificationExecutor } from "../../data/notification-transactions";
import { guarded, locks, authority, hash, statement as q, workspaceSql as ws } from "../store";
import { PayrollError } from "../model";
import { parseNativeProfileCommand } from "./model";
import type { NativeProfileReceipt, NativeProfilesResponse, NativeConfigurationRevision } from "./contracts";
const check = (condition: string, ...values: unknown[]): SqlStatement => q(`SELECT (CASE WHEN ${condition} THEN '1' ELSE 'NATIVE_PROFILE_CONFLICT' END)::integer`, ...values);
const member = (employeeId: string) => check(`EXISTS(SELECT 1 FROM employees e JOIN locations l ON l.id=e.primary_location_id WHERE e.id=$1 AND l.workspace_id=${ws})`, employeeId);
const locations = (ids: string[]) => check(`(SELECT count(*) FROM locations WHERE workspace_id=${ws} AND active AND id=ANY($1::text[]))=cardinality($1::text[])`, ids);
async function saved(proof: SessionMutationProof, input: {
    operationId: string;
}, ex: SqlExecutor) {
    const [row] = await guarded<{
        payload: NativeProfileReceipt;
        command_hash: string;
    }>(proof, "OWNER", q(`SELECT payload,command_hash FROM payroll_command_receipts WHERE workspace_id=${ws} AND actor_id=$1 AND operation_id=$2::uuid`, proof.employee.id, input.operationId), ex);
    if (row && row.command_hash !== hash(input))
        throw new PayrollError("OPERATION_CONFLICT", 409);
    return row?.payload;
}
export async function nativeProfiles(proof: SessionMutationProof, ex: SqlExecutor = neonNotificationExecutor()): Promise<NativeProfilesResponse> {
    const [row] = await guarded<Omit<NativeProfilesResponse, "version">>(proof, "OWNER", q(`SELECT COALESCE((SELECT jsonb_agg(payload ORDER BY employee_id) FROM native_payroll_profiles_current WHERE workspace_id=${ws}),'[]') AS configurations,COALESCE((SELECT jsonb_agg(jsonb_build_object('employeeId',employee_id,'ytd',payload) ORDER BY employee_id,tax_year) FROM native_payroll_opening_ytd_current WHERE workspace_id=${ws}),'[]') AS "openingYtd",COALESCE((SELECT jsonb_agg(payload ORDER BY employee_id) FROM native_payroll_manager_scopes_current WHERE workspace_id=${ws}),'[]') AS "managerScopes"`), ex);
    return { ...row, version: "PAYROLL_NATIVE_PROFILES_V1" };
}
/** Owner-only append of configuration, opening-YTD attestation or Manager scope.
 * Subject/location checks and expectedRevision run with actor-scoped receipt storage;
 * replay accepts the same operation only when the normalized command hash matches. */
export async function saveNativeProfile(proof: SessionMutationProof, value: unknown, ex: SqlExecutor = neonNotificationExecutor()): Promise<NativeProfileReceipt> {
    const c = parseNativeProfileCommand(value);
    const prior = await saved(proof, c, ex);
    if (prior)
        return prior;
    const employeeId = c.action === "SAVE_NATIVE_PROFILE" ? c.configuration.employeeId : c.employeeId, revision = c.expectedRevision + 1;
    const receipt: NativeProfileReceipt = { operationId: c.operationId, action: c.action, employeeId, revision };
    const mutations: SqlStatement[] = [member(employeeId)];
    if (c.action === "SAVE_NATIVE_PROFILE") {
        const payload: NativeConfigurationRevision = { ...c.configuration, revision, actorId: proof.employee.id, reason: c.reason, createdAt: new Date().toISOString() };
        mutations.push(locations([...new Set(c.configuration.wages.flatMap(w => w.locationIds))]), check(`COALESCE((SELECT max(revision) FROM native_payroll_profile_revisions WHERE workspace_id=${ws} AND employee_id=$1),0)=$2`, employeeId, c.expectedRevision), q(`INSERT INTO native_payroll_profile_revisions VALUES(${ws},$1,$2,$3::jsonb)`, employeeId, revision, JSON.stringify(payload)));
    }
    else if (c.action === "ATTEST_OPENING_YTD") {
        mutations.push(locations(c.ytd.locationIds), check(`COALESCE((SELECT max(revision) FROM native_payroll_opening_ytd_revisions WHERE workspace_id=${ws} AND employee_id=$1 AND tax_year=$2),0)=$3`, employeeId, c.ytd.year, c.expectedRevision), q(`INSERT INTO native_payroll_opening_ytd_revisions VALUES(${ws},$1,$2,$3,$4::jsonb)`, employeeId, c.ytd.year, revision, JSON.stringify({...c.ytd,revision})));
    }
    else {
        mutations.push(locations(c.locationIds), check(`EXISTS(SELECT 1 FROM employees WHERE id=$1 AND active AND role='MANAGER')`, employeeId), check(`COALESCE((SELECT max(revision) FROM native_payroll_manager_scope_revisions WHERE workspace_id=${ws} AND employee_id=$1),0)=$2`, employeeId, c.expectedRevision), q(`INSERT INTO native_payroll_manager_scope_revisions SELECT ${ws},e.id,$2,e.updated_at::text,$3::jsonb||jsonb_build_object('subjectEmployeeVersion',e.updated_at::text) FROM employees e WHERE e.id=$1`, employeeId, revision, JSON.stringify({ employeeId, revision, review: c.review, approve: c.approve, locationIds: c.locationIds, reason: c.reason, actorId: proof.employee.id, operationId: c.operationId })));
    }
    try {
        await ex.transaction([...locks(), ...authority(proof, "OWNER"), ...mutations, q(`INSERT INTO payroll_command_receipts VALUES(${ws},$1,$2::uuid,$3,$4::jsonb)`, proof.employee.id, c.operationId, hash(c), JSON.stringify(receipt)), ...authority(proof, "OWNER")]);
        return receipt;
    }
    catch (error) {
        const retry = await saved(proof, c, ex);
        if (retry)
            return retry;
        throw error;
    }
}
