"use server";

import { redirect } from "next/navigation";
import { hashPassword } from "@/lib/auth/password";
import { activateEmployeeCredential } from "@/lib/data/employees";

export async function activateAccountAction(formData: FormData) {
  const employeeId = String(formData.get("employeeId") ?? "")
    .trim()
    .toUpperCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (
    !employeeId ||
    !phone ||
    password.length < 8 ||
    password !== confirmPassword
  ) {
    redirect("/activate?error=invalid");
  }

  const passwordHash = await hashPassword(password);
  const activated = await activateEmployeeCredential({
    employeeId,
    phone,
    passwordHash,
  });

  if (!activated) {
    redirect("/activate?error=not_found");
  }

  redirect("/login?activated=1");
}
