"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { findEmployeeCredential } from "@/lib/data/employees";
import { dummyPasswordHash, verifyPassword } from "@/lib/auth/password";
import { admitLoginAttempt, clientAddress } from "@/lib/auth/login-limits.server";
import { createSession, destroySession } from "@/lib/auth/session";
import { safeReturnTo } from "@/lib/notifications/destinations";
import { prepareInstallationForLogin } from "@/lib/notifications/logout";
import { activeDeletionRequest } from "@/lib/account-deletion/requests.server";
import { passwordLoginAllowed } from "@/lib/auth/login-limits";

/**
 * Password sign-in boundary: normalize the employee ID, admit the attempt before
 * verification, check account state and issue an opaque session. Passwords are
 * not trimmed. Successful authentication redirects only to a vetted return path;
 * Next's redirect throws to end the action and must not be swallowed.
 */
export async function login(formData: FormData) {
  const returnTo = safeReturnTo(String(formData.get("returnTo") ?? ""));
  const returnQuery = returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : "";
  const employeeId = String(formData.get("employeeId") ?? "")
    .trim()
    .toUpperCase();
  const password = String(formData.get("password") ?? "");

  if (!employeeId || !password) {
    redirect(`/login?error=invalid${returnQuery}`);
  }

  // Counted before the password is checked, so parallel guesses can't slip past the limit.
  const address = clientAddress((await headers()).get("x-forwarded-for"));
  if (!(await admitLoginAttempt(employeeId, address))) {
    redirect(`/login?error=busy${returnQuery}`);
  }

  if (!(await passwordLoginAllowed(employeeId))) redirect(`/login?error=invalid${returnQuery}`);

  const employee = await findEmployeeCredential(employeeId);
  // Unknown and inactive IDs are checked against a dummy hash so every failure takes the same time.
  const passwordMatches = await verifyPassword(password, employee?.active ? employee.password_hash : await dummyPasswordHash());

  if (!employee || !employee.active || !passwordMatches) {
    redirect(`/login?error=invalid${returnQuery}`);
  }

  // An account with an open deletion request stays signed out. Checked only after the password matches,
  // so the message never reveals anything about an account to someone who doesn't control it.
  if (await activeDeletionRequest(employee.id)) redirect(`/login?error=deleting${returnQuery}`);

  await prepareInstallationForLogin(employee.id);
  try { await createSession(employee.id, employee); }
  catch (error) {
    if (error instanceof Error && error.message.includes('session_login_changed')) redirect(`/login?error=invalid${returnQuery}`);
    throw error;
  }
  redirect(returnTo ?? "/app");
}

/** Ends the session and always leaves the protected app, even if cleanup fails. */
export async function logout() {
  try { await destroySession(); } finally { redirect("/login"); }
}
