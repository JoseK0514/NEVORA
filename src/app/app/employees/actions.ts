"use server";

import {requireSessionMutationProof} from '@/lib/auth/session';
import {parseOperationalProfileForm} from '@/lib/shift-changes/policy-form';
import {saveOperationalRuleProfile} from '@/lib/data/shift-change-policy';
import {neonNotificationExecutor} from '@/lib/data/notification-transactions';
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import {
  insertEmployee,
  saveEmployeeSchedulingProfile,
  updateEmployeeProfile,
} from "@/lib/data/employees";
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

export async function saveEmployeeCoreProfileAction(formData: FormData) {
  const actor = await requireRoles(MANAGER_ROLES);
  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const expectedUpdatedAt = String(
    formData.get("expectedUpdatedAt") ?? "",
  ).trim();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const phone = normalizePhoneNumber(String(formData.get("phone") ?? ""));
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "") as UserRole;
  const primaryLocationId = String(
    formData.get("primaryLocationId") ?? "",
  ).trim();
  const activeValue = String(formData.get("active") ?? "");

  if (
    !employeeId ||
    !expectedUpdatedAt ||
    !firstName ||
    !lastName ||
    !phone ||
    !ROLES.includes(role) ||
    !primaryLocationId ||
    !["true", "false"].includes(activeValue)
  ) {
    return { error: "Complete all required employee details." };
  }

  try {
    await updateEmployeeProfile({
      employeeId,
      expectedUpdatedAt,
      firstName,
      lastName,
      phone,
      email: email || undefined,
      role,
      primaryLocationId,
      active: activeValue === "true",
      actorEmployeeId: actor.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("employee_profile_stale")) {
      return {
        error:
          "This employee changed since you opened the profile. Reload and review the latest details.",
      };
    }
    if (message.includes("employee_profile_permission_denied")) {
      return {
        error: "You do not have permission to make this employee change.",
      };
    }
    if (message.includes("employee_profile_last_owner")) {
      return {
        error: "Keep at least one active Owner in the workspace.",
      };
    }
    if (message.includes("employee_profile_location_invalid")) {
      return {
        error:
          "Choose an active primary location. An inactive existing location can only be retained while the employee remains inactive.",
      };
    }
    return {
      error:
        "Employee details could not be saved. Check the email and current profile, then try again.",
    };
  }

  revalidatePath("/app/employees");
  revalidatePath(`/app/employees/${encodeURIComponent(employeeId)}`);
  return { success: "Employee details updated." };
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

export async function saveOperationalRulesAction(data:FormData):Promise<import('@/lib/shift-changes/types').PolicyWriteResult>{
 const input=parseOperationalProfileForm(data);if(!input)return {status:'invalid',fieldErrors:[{field:'profile',message:'Choose every rule status explicitly and complete configured values, time basis and routing.'}]};
 const proof=await requireSessionMutationProof();if(proof.employee.role!=='OWNER')return {status:'invalid',fieldErrors:[{field:'authorization',message:'Only an active Owner can review operational rules.'}]};
 const result=await saveOperationalRuleProfile({...input,proof},neonNotificationExecutor());if(result.status==='saved'){revalidatePath('/app/employees');revalidatePath(`/app/employees/${encodeURIComponent(input.employeeId)}`);revalidatePath('/app/exchange');revalidatePath('/app/schedule');revalidatePath('/app');}return result;
}
