import type { SessionMutationProof } from "../../shift-changes/types";
import type { SqlExecutor } from "../../notifications/types";
import {
  assertManagementProof,
  managementSessionStatements,
} from "../../data/management-session";
import { getWorkspace, workspaceReadGuard } from "../../data/workspaces";
import { neonNotificationExecutor } from "../../data/notification-transactions";
import {
  parseCompanyPolicyCommand,
  companyPolicyCommandHash,
  effectiveCompanyPolicies,
  type CompanyPolicySettings,
} from "./model";
export type PolicyRevision = {
  operationId: string;
  revision: number;
  locationId: string | null;
  changedAt: string;
  changedKeys: string[];
  settings: CompanyPolicySettings;
};
export async function readCompanyPolicies(
  proof: SessionMutationProof,
  executor: SqlExecutor = neonNotificationExecutor(),
): Promise<PolicyRevision[]> {
  assertManagementProof(proof, proof.employee.id);
  const workspace = await getWorkspace(executor);
  const guards = [
    ...workspaceReadGuard(workspace),
    {
      text: "SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE",
      values: [proof.employee.id],
    },
    ...managementSessionStatements(proof, proof.employee.id, ["OWNER"]),
  ];
  const result = await executor.transaction([
    ...guards,
    {
      text: 'SELECT operation_id::text AS "operationId",revision,location_id AS "locationId",changed_at::text AS "changedAt",changed_keys AS "changedKeys",settings FROM nevora_company_policy_revisions WHERE workspace_id=$1 ORDER BY changed_at DESC',
      values: [workspace.id],
    },
    ...managementSessionStatements(proof, proof.employee.id, ["OWNER"]),
  ]);
  return result[guards.length] as PolicyRevision[];
}
export async function saveCompanyPolicy(
  proof: SessionMutationProof,
  input: unknown,
  executor: SqlExecutor = neonNotificationExecutor(),
): Promise<Omit<PolicyRevision, "settings">> {
  assertManagementProof(proof, proof.employee.id);
  const command = parseCompanyPolicyCommand(input),
    workspace = await getWorkspace(executor),
    settings = command.settings;
  const employees = [
    ...new Set([
      proof.employee.id,
      ...(settings.labor?.rates ?? []).map((r) => r.employeeId),
    ]),
  ].sort();
  const locations = [
    ...new Set([
      ...(command.locationId ? [command.locationId] : []),
      ...(settings.labor?.rates ?? []).flatMap((r) =>
        r.locationId ? [r.locationId] : [],
      ),
      ...(settings.labor?.budgets ?? []).flatMap((r) =>
        r.locationId ? [r.locationId] : [],
      ),
    ]),
  ].sort();
  const guards = [
    {
      text: "SELECT id FROM workspaces WHERE singleton=true ORDER BY id FOR NO KEY UPDATE",
      values: [],
    },
    ...workspaceReadGuard(workspace),
    {
      text: "SELECT id FROM employees WHERE id=ANY($1::text[]) ORDER BY id FOR SHARE",
      values: [employees],
    },
    {
      text: "SELECT id FROM locations WHERE id=ANY($1::text[]) ORDER BY id FOR SHARE",
      values: [locations],
    },
    {
      text: "SELECT id FROM clocker_break_types WHERE id=ANY($1::text[]) ORDER BY id FOR SHARE",
      values: [settings.labor?.compensation?.excludedBreakTypeIds ?? []],
    },
    ...managementSessionStatements(proof, proof.employee.id, ["OWNER"]),
  ];
  const result = await executor.transaction([
    ...guards,
    {
      text: "SELECT nevora_set_company_policy($1::uuid,$2,$3,$4,$5::integer,$6::jsonb,$7) AS result",
      values: [
        command.operationId,
        workspace.id,
        command.locationId,
        proof.employee.id,
        command.expectedRevision,
        JSON.stringify(settings),
        companyPolicyCommandHash(command),
      ],
    },
    ...managementSessionStatements(proof, proof.employee.id, ["OWNER"]),
  ]);
  const saved = (
    result[guards.length]?.[0] as { result: Omit<PolicyRevision, "settings"> }
  )?.result;
  if (!saved) throw Error("Policy outcome unknown; retry original command.");
  return saved;
}
/** Project only attendance thresholds for management. Never return compensation,
 * rates, budgets, Owner history or method references to a Manager. */
export function attendancePolicyProjection(
  rows: PolicyRevision[],
  locationId: string,
) {
  const company = rows
      .filter((r) => r.locationId === null)
      .sort((a, b) => b.revision - a.revision)[0],
    location = rows
      .filter((r) => r.locationId === locationId)
      .sort((a, b) => b.revision - a.revision)[0];
  const effective = effectiveCompanyPolicies(
    company?.settings ?? null,
    location?.settings ?? null,
  );
  return {
    locationId,
    companyRevision: company?.revision ?? 0,
    locationRevision: location?.revision ?? 0,
    effective: {
      version: 1 as const,
      attendance: effective.attendance,
      labor: {
        overtimeRisk: effective.labor.overtimeRisk,
        compensation: null,
        rates: null,
        budgets: null,
        calculationMethod: null,
      },
    },
  };
}
