"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { findEmployeeCredential } from "@/lib/data/employees";
import { dummyPasswordHash, verifyPassword } from "@/lib/auth/password";
import { admitLoginAttempt, clientAddress } from "@/lib/auth/login-limits.server";
import { createSession, destroySession } from "@/lib/auth/session";
import { safeReturnTo } from "@/lib/notifications/destinations";
import { prepareInstallationForLogin } from "@/lib/notifications/logout";

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

  const employee = await findEmployeeCredential(employeeId);
  // Unknown and inactive IDs are checked against a dummy hash so every failure takes the same time.
  const passwordMatches = await verifyPassword(password, employee?.active ? employee.password_hash : await dummyPasswordHash());

  if (!employee || !employee.active || !passwordMatches) {
    redirect(`/login?error=invalid${returnQuery}`);
  }

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
