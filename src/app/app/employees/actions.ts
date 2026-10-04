"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { insertEmployee, saveEmployeeSchedulingProfile } from "@/lib/data/employees";
import type { UserRole } from "@/lib/domain";
import { normalizePhoneNumber } from "@/lib/phone";

const ROLES: UserRole[] = ["OWNER", "MANAGER", "LEAD", "EMPLOYEE"];

async function createEmployee(formData: FormData, inline=false) {
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
    !id ||
    !firstName ||
    !lastName ||
    !phone ||
    !ROLES.includes(role) ||
    !primaryLocationId
  ) {
    employeeFailure('invalid',inline);
  }

  if (role === "OWNER" && session.role !== "OWNER") {
    employeeFailure('permission',inline);
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
      positionIds: formData.getAll("positionIds").map(String),
      actorEmployeeId: session.id,
    });
  } catch {
    employeeFailure('save',inline);
  }

  revalidatePath("/app/employees");
  if(inline)return {success:"Employee created. Open Employees to view the scheduling profile."};
  redirect("/app/employees?created=1");
}

export async function saveEmployeeSchedulingProfileAction(formData: FormData) {
  const actor = await requireRoles(MANAGER_ROLES);
  try {
    const employeeId = String(formData.get("employeeId") ?? "");
    await saveEmployeeSchedulingProfile({
      employeeId,
      positionIds: formData.getAll("positionIds").map(String),
      eligibleLocationIds: formData.getAll("eligibleLocationIds").map(String),
      actorEmployeeId: actor.id,
    });
    revalidatePath("/app/employees");
    revalidatePath(`/app/employees/${encodeURIComponent(employeeId)}`);
    return { success: "Scheduling profile updated." };
  } catch {
    return {
      error:
        "Profile could not be saved. Choose active positions and locations; existing inactive references may be retained.",
    };
  }
}

const employeeErrors: Record<string, string> = {
  invalid: "Complete all required employee fields.",
  permission: "Only an Owner can create another Owner.",
  save: "Employee could not be saved. Check unique ID/email and active locations/positions.",
};
function employeeFailure(code: string, inline: boolean): never {
  if (inline) throw new Error(employeeErrors[code]);
  redirect(`/app/employees/new?error=${code}`);
}
export async function createEmployeeAction(data: FormData): Promise<void> {
  await createEmployee(data);
}
export async function createEmployeeFormAction(data: FormData) {
  try {
    return (await createEmployee(data, true))!;
  } catch (error) {
    return {
      error:
        error instanceof Error &&
        Object.values(employeeErrors).includes(error.message)
          ? error.message
          : "Employee could not be saved. Your entries are preserved.",
    };
  }
}
