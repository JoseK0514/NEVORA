"use server";

import { redirect } from "next/navigation";
import { findEmployeeCredential, getEmployeeActivationState } from "@/lib/data/employees";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";

export async function login(formData: FormData) {
  const employeeId = String(formData.get("employeeId") ?? "")
    .trim()
    .toUpperCase();
  const password = String(formData.get("password") ?? "");

  if (!employeeId || !password) {
    redirect("/login?error=invalid");
  }

  const activation = await getEmployeeActivationState(employeeId);

  if (activation && activation.active && !activation.has_credential) {
    redirect(`/activate?employeeId=${encodeURIComponent(employeeId)}`);
  }

  const employee = await findEmployeeCredential(employeeId);

  if (
    !employee ||
    !employee.active ||
    !(await verifyPassword(password, employee.password_hash))
  ) {
    redirect("/login?error=invalid");
  }

  await createSession(employee.id);
  redirect("/app");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
