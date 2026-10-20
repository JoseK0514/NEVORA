"use server";

import { requireSessionMutationProof } from "@/lib/auth/session";
import { submitDeletionRequest } from "@/lib/account-deletion/requests.server";
import { POLICY_VERSION, policiesVisible } from "@/lib/legal/policies";

export type DeletionFormState =
  | { kind: "idle" | "wrong_password" | "failed" | "unavailable" }
  | { kind: "received" | "duplicate"; reference: string; confirmedAt: string };

/** Delete my account: the signed-in person, their password again, then one saved request. Success is only
 * reported after the request is stored, and by then every session of the person has ended. */
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
  // Every session row is already deleted, so this browser's cookie opens nothing. Clearing it here would re-render
  // the page without a session and send the person to sign-in before they see their reference; Done signs out.
  return { kind: result.outcome, reference: result.request.reference, confirmedAt: result.request.confirmedAt };
}
