"use server";

import {issueInitialPasswordReplacement} from '@/lib/auth/recovery.server';
import {publicWorkspaceToken} from '@/lib/workspace-routing/token-envelope.server';
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { findEmployeeCredential } from "@/lib/data/employees";
import { dummyPasswordHash, verifyPassword } from "@/lib/auth/password";
import { admitLogin, clientAddress, releaseLoginAddress } from "@/lib/auth/login-limits.server";
import { createSession, destroySession } from "@/lib/auth/session";
import { safeReturnTo } from "@/lib/notifications/destinations";
import { prepareInstallationForLogin } from "@/lib/notifications/logout";
import { activeDeletionRequest } from "@/lib/account-deletion/requests.server";
import { passwordLoginAllowed } from "@/lib/auth/login-limits";
import { clearLoginId, keepLoginId } from "./kept-id";

/**
 * Password sign-in boundary: normalize the employee ID, admit the attempt before
 * verification, check account state and issue an opaque session. Passwords are
 * not trimmed. Successful authentication redirects only to a vetted return path;
 * Next's redirect throws to end the action and must not be swallowed.
 * Every return to the sign-in page keeps the Employee ID as typed for the form (kept-id.ts), the same way whatever
 * the reason, so it says nothing about the account; the password is never kept.
 */
export async function login(formData: FormData) {
  const returnTo = safeReturnTo(String(formData.get("returnTo") ?? ""));
  const returnQuery = returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : "";
  const typedId = String(formData.get("employeeId") ?? "").trim();
  const employeeId = typedId.toUpperCase();
  const password = String(formData.get("password") ?? "");

  if (!employeeId || !password) {
    await keepLoginId(typedId);
    redirect(`/login?error=invalid${returnQuery}`);
  }

  // Counted before the password is checked, so parallel guesses can't slip past the limit.
  const address = clientAddress((await headers()).get("x-forwarded-for"));
  const admission = await admitLogin(employeeId, address);
  if (!admission.admitted) {
    await keepLoginId(typedId);
    redirect(`/login?error=busy${returnQuery}`);
  }

  if (!(await passwordLoginAllowed(employeeId))) { await keepLoginId(typedId); redirect(`/login?error=invalid${returnQuery}`); }

  const employee = await findEmployeeCredential(employeeId);
  // Unknown and inactive IDs are checked against a dummy hash so every failure takes the same time.
  const passwordMatches = await verifyPassword(password, employee?.active ? employee.password_hash : await dummyPasswordHash());

  if (!employee || !employee.active || !passwordMatches) {
    await keepLoginId(typedId);
    redirect(`/login?error=invalid${returnQuery}`);
  }

  // The password is proven, so this attempt no longer counts against the shared network address (best effort).
  try { await releaseLoginAddress(address, admission); } catch { /* the attempt stays counted */ }

  // An account with an open deletion request stays signed out. Checked only after the password matches,
  // so the message never reveals anything about an account to someone who doesn't control it.
  if (await activeDeletionRequest(employee.id)) { await keepLoginId(typedId); redirect(`/login?error=deleting${returnQuery}`); }

  if(employee.must_change_password){
    const replacement=await issueInitialPasswordReplacement(employee.id,employee);
    // Codex (Nov 15 handoff): the kept Employee ID stays on every expected failure and is cleared on the transfer to
    // the replacement screen, as after a successful sign-in.
    // The password was right: say so honestly (not "incorrect") and keep the Employee ID for the retry.
    if(replacement.state!=='issued'){await keepLoginId(typedId);redirect(`/login?error=replace${returnQuery}`);}
    const proof=await publicWorkspaceToken('RECOVERY',replacement.proof,Date.parse(replacement.expiresAt));
    await clearLoginId();
    redirect(`/reset-access#proof=${encodeURIComponent(proof)}`);
  }
  await prepareInstallationForLogin(employee.id);
  try { await createSession(employee.id, employee); }
  catch (error) {
    if (error instanceof Error && error.message.includes('session_login_changed')) { await keepLoginId(typedId); redirect(`/login?error=invalid${returnQuery}`); }
    throw error;
  }
  await clearLoginId();
  redirect(returnTo ?? "/app");
}

/** Ends the session and always leaves the protected app, even if cleanup fails. */
export async function logout() {
  try { await destroySession(); } finally { redirect("/login"); }
}
