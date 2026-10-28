"use server";

import { headers } from "next/headers";
import { readSessionMutationProof } from "@/lib/auth/session";
import { admitLoginAttempt, clientAddress } from "@/lib/auth/login-limits.server";
import { activeDeletionRequest, checkDeletionRequest, submitDeletionRequest, type DeletionRequest } from "@/lib/account-deletion/requests.server";
import { POLICY_VERSION, policiesVisible } from "@/lib/legal/policies";

/** `uncertain`: the request may or may not be saved; only a later check can say. `signed_out`: no session and no
 * open request for the account the page was showing. `changed`: this browser is now signed in as someone else. */
export type DeletionFormState =
  | { kind: "idle" | "wrong_password" | "failed" | "unavailable" | "uncertain" | "busy" | "signed_out" | "changed" }
  | { kind: "received" | "duplicate"; reference: string; confirmedAt: string };

const done = (kind: "received" | "duplicate", request: DeletionRequest): DeletionFormState => ({ kind, reference: request.reference, confirmedAt: request.confirmedAt });

/** Delete my account: the signed-in person, their password again, then one saved request. Success is only
 * reported after the request is stored, and by then every session of the person has ended.
 *
 * Acceptance ends every session in the same transaction, so a reply lost after COMMIT leaves a browser that can't
 * ask with its cookie. Sending the same form again resolves it: with a session it returns the open request, and
 * without one it checks the password (counted like sign-in) and returns only this account's open request. Every
 * password check is counted, so a session can't be used to guess the password here either. */
export async function requestAccountDeletion(previous: DeletionFormState, formData: FormData): Promise<DeletionFormState> {
  if (!policiesVisible()) return { kind: "unavailable" };
  const account = String(formData.get("account") ?? "");
  const password = String(formData.get("password") ?? "");
  // The page sets `retry` once an attempt's outcome is unknown, and keeps it through a mistyped password.
  const retried = formData.get("retry") === "1" || previous.kind === "uncertain" || previous.kind === "busy";
  let proof;
  try { proof = await readSessionMutationProof(); } catch { return retried ? { kind: "uncertain" } : { kind: "failed" }; }
  if (proof && proof.employee.id !== account) return { kind: "changed" };
  if (!account) return { kind: "signed_out" };
  try {
    if (!(await admitLoginAttempt(account, clientAddress((await headers()).get("x-forwarded-for"))))) return { kind: "busy" };
  } catch {
    // Nothing about the request was sent yet; only an earlier attempt can still be unknown.
    return retried ? { kind: "uncertain" } : { kind: "failed" };
  }

  if (!proof) {
    try {
      const check = await checkDeletionRequest({ employeeId: account, password });
      if (check.outcome === "found") return done(retried ? "received" : "duplicate", check.request);
      if (check.outcome === "none") return { kind: "signed_out" };
      return { kind: check.outcome };
    } catch {
      return { kind: "uncertain" };
    }
  }

  // Every session row is deleted on acceptance, so this browser's cookie opens nothing. Clearing it here would
  // re-render the page without a session and send the person to sign-in before they see their reference; Done signs out.
  try {
    const result = await submitDeletionRequest({ employeeId: proof.employee.id, password, channel: "web", policyVersion: POLICY_VERSION });
    if (result.outcome === "received" || result.outcome === "duplicate") return done(retried && result.outcome === "duplicate" ? "received" : result.outcome, result.request);
    if (result.outcome === "failed") return retried ? { kind: "uncertain" } : { kind: "failed" };
    return { kind: result.outcome };
  } catch {
    // The reply may have been lost after COMMIT. Ask again before saying anything.
    const saved = await activeDeletionRequest(proof.employee.id).catch(() => undefined);
    return saved ? done("received", saved) : { kind: "uncertain" };
  }
}
