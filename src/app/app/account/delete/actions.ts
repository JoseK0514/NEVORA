"use server";

import { requireSessionMutationProof, destroySession } from "@/lib/auth/session";
import { submitDeletionRequest } from "@/lib/account-deletion/requests.server";
import { POLICY_VERSION, policiesVisible } from "@/lib/legal/policies";

export type DeletionFormState =
  | { kind: "idle" | "wrong_password" | "failed" | "unavailable" }
  | { kind: "received" | "duplicate"; reference: string; confirmedAt: string };

/** Delete my account: the signed-in person, their password again, then one saved request. Success is only
 * reported after the request is stored; the person is then signed out here as well as everywhere else. */
export async function requestAccountDeletion(_previous: DeletionFormState, formData: FormData): Promise<DeletionFormState> {
  if (!policiesVisible()) return { kind: "unavailable" };
  const proof = await requireSessionMutationProof();
  let result;
  try {
    result = await submitDeletionRequest({ employeeId: proof.employee.id, password: String(formData.get("password") ?? ""), channel: "web", policyVersion: POLICY_VERSION });
  } catch {
    return { kind: "failed" };
  }
  if (result.outcome === "wrong_password" || result.outcome === "unavailable") return { kind: result.outcome };
  try { await destroySession(); } catch { /* The session row is already gone; the cookie is cleared in destroySession's finally. */ }
  return { kind: result.outcome, reference: result.request.reference, confirmedAt: result.request.confirmedAt };
}
