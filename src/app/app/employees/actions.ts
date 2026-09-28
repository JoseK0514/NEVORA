"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { insertEmployee } from "@/lib/data/employees";
import type { UserRole } from "@/lib/domain";

const ROLES: UserRole[] = ["OWNER", "MANAGER", "LEAD", "EMPLOYEE"];

export async function createEmployeeAction(formData: FormData) {
  const session = await requireRoles(MANAGER_ROLES);

  const id = String(formData.get("id") ?? "").trim().toUpperCase();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const emailValue = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "") as UserRole;
  const primaryLocationId = String(formData.get("primaryLocationId") ?? "");
  const eligibleLocationIds = formData
    .getAll("eligibleLocationIds")
    .map(String)
    .filter(Boolean);

  if (
    !id ||
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
  } catch {
    redirect("/app/employees/new?error=save");
  }

  revalidatePath("/app/employees");
  redirect("/app/employees?created=1");
}
