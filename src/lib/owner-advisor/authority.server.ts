import "server-only";
import {
  assertOperationalAccess,
  assertOriginalOperationalAccess,
  operationalScopeStatements,
} from "@/lib/company-access/operational-scope.server";
import { managementSessionStatements } from "@/lib/data/management-session";
import { workspaceReadGuard } from "@/lib/data/workspaces";
import type { SessionMutationProof } from "@/lib/shift-changes/types";
import type { SqlExecutor } from "@/lib/notifications/types";
import { AdvisorError } from "./contracts";
export type OwnerAdmission = Awaited<
  ReturnType<typeof assertOperationalAccess>
>;
export function ownerGuards(
  proof: SessionMutationProof,
  original: OwnerAdmission,
) {
  return [
    ...workspaceReadGuard(original.workspace),
    {
      text: "SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE",
      values: [proof.employee.id],
    },
    ...managementSessionStatements(proof, proof.employee.id, ["OWNER"]),
    ...operationalScopeStatements(
      proof,
      original.workspace,
      { kind: "COMPANY" },
      original.authority,
    ),
  ];
}
export async function admitOwner(
  proof: SessionMutationProof,
  ex: SqlExecutor,
): Promise<OwnerAdmission> {
  if (proof.employee.role !== "OWNER") throw new AdvisorError("forbidden");
  const admission = await assertOperationalAccess(
    proof,
    { kind: "COMPANY" },
    ex,
  );
  await ex.transaction(ownerGuards(proof, admission));
  return admission;
}
export async function checkOwner(
  proof: SessionMutationProof,
  original: OwnerAdmission,
  ex: SqlExecutor,
) {
  await assertOriginalOperationalAccess(proof, original, ex);
  await ex.transaction(ownerGuards(proof, original));
}
