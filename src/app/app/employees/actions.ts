"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { generateAvailableEmployeeId, insertEmployee } from "@/lib/data/employees";
import type { UserRole } from "@/lib/domain";
import { normalizePhoneNumber } from "@/lib/phone";

const ROLES: UserRole[] = ["OWNER", "MANAGER", "LEAD", "EMPLOYEE"];

export async function generateEmployeeIdAction() {
  await requireRoles(MANAGER_ROLES);
  return generateAvailableEmployeeId();
}

export async function createEmployeeAction(formData: FormData) {
  const session = await requireRoles(MANAGER_ROLES);

  const id = String(formData.get("id") ?? "").trim().toUpperCase();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const phone = normalizePhoneNumber(String(formData.get("phone") ?? ""));
  const emailValue = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "") as UserRole;
  const primaryLocationId = String(formData.get("primaryLocationId") ?? "");
  const eligibleLocationIds = formData
    .getAll("eligibleLocationIds")
    .map(String)
    .filter(Boolean);

  if (
    !/^FC-\d{4,}$/.test(id) ||
    !firstName ||
    !lastName ||
    !phone ||
    !ROLES.includes(role) ||
    !primaryLocationId
  ) {
    redirect("/app/employees/new?error=invalid");
  }

  if (role === "OWNER" && session.role !== "OWNER") {
    redirect("/app/employees/new?error=permission");
  }

  try {
    await insertEmployee({
      id,
      firstName,
      lastName,
      phone,
      email: emailValue || undefined,
      role,
      primaryLocationId,
      eligibleLocationIds,
    });
  } catch (error) {
    if (error && typeof error === "object" && "constraint" in error && error.constraint === "employees_pkey") {
      redirect("/app/employees/new?error=id_taken");
    }
    redirect("/app/employees/new?error=save");
  }

  revalidatePath("/app/employees");
  redirect("/app/employees?created=1");
}
