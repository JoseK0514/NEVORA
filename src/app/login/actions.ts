"use server";

import { redirect } from "next/navigation";
import { findEmployeeCredential } from "@/lib/data/employees";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { safeReturnTo } from "@/lib/notifications/destinations";
import { prepareInstallationForLogin } from "@/lib/notifications/logout";
import { activeDeletionRequest } from "@/lib/account-deletion/requests.server";

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

  const employee = await findEmployeeCredential(employeeId);

  if (
    !employee ||
    !employee.active ||
    !(await verifyPassword(password, employee.password_hash))
  ) {
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

export async function logout() {
  try { await destroySession(); } finally { redirect("/login"); }
}
