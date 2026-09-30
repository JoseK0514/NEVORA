"use server";

import { redirect } from "next/navigation";
import { hashPassword } from "@/lib/auth/password";
import { activateEmployeeCredential } from "@/lib/data/employees";
import { normalizePhoneNumber } from "@/lib/phone";

export async function activateAccountAction(formData: FormData) {
  const employeeId = String(formData.get("employeeId") ?? "")
    .trim()
    .toUpperCase();
  const phone = normalizePhoneNumber(String(formData.get("phone") ?? ""));
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!employeeId || !phone || password.length < 8) {
    redirect(`/activate?error=invalid&employeeId=${encodeURIComponent(employeeId)}`);
  }
  if (password !== confirmPassword) {
    redirect(`/activate?error=mismatch&employeeId=${encodeURIComponent(employeeId)}`);
  }

  const passwordHash = await hashPassword(password);
  const activated = await activateEmployeeCredential({
    employeeId,
    phone,
    passwordHash,
  });

  if (!activated) {
    redirect(`/activate?error=not_found&employeeId=${encodeURIComponent(employeeId)}`);
  }

  redirect("/login?activated=1");
}
