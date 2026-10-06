"use server";

import { redirect } from "next/navigation";
import { hashPassword } from "@/lib/auth/password";
import { activateEmployeeCredential } from "@/lib/data/employees";
import { safeReturnTo } from "@/lib/notifications/destinations";
import { normalizePhoneNumber } from "@/lib/phone";

export async function activateAccountAction(formData: FormData) {
  const returnTo = safeReturnTo(String(formData.get("returnTo") ?? ""));
  const returnQuery = returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : "";
  const employeeId = String(formData.get("employeeId") ?? "")
    .trim()
    .toUpperCase();
  const phone = normalizePhoneNumber(String(formData.get("phone") ?? ""));
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (
    !employeeId ||
    !phone ||
    password.length < 8 ||
    password !== confirmPassword
  ) {
    redirect(`/activate?error=invalid${returnQuery}`);
  }

  const passwordHash = await hashPassword(password);
  const activated = await activateEmployeeCredential({
    employeeId,
    phone,
    passwordHash,
  });

  if (!activated) {
    redirect(`/activate?error=not_found${returnQuery}`);
  }

  redirect(`/login?activated=1${returnQuery}`);
}
