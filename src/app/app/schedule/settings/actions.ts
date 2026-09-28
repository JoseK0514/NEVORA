"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import {
  listEmployeeHourTargets,
  listLocationStaffingSettings,
  saveEmployeeHourTargets,
  saveLocationStaffingSettings,
} from "@/lib/data/schedule-health";

export async function saveScheduleHealthSettingsAction(formData: FormData) {
  await requireRoles(MANAGER_ROLES);

  const [locations, employees] = await Promise.all([
    listLocationStaffingSettings(),
    listEmployeeHourTargets(),
  ]);

  const staffingSettings = locations.map((location) => {
    const value = Number(formData.get(`staffing-${location.locationId}`));

    if (!Number.isInteger(value) || value < 1 || value > 100) {
      redirect("/app/schedule/settings?error=invalid_staffing");
    }

    return {
      locationId: location.locationId,
      minimumStaffPerShift: value,
    };
  });

  const hourTargets = employees.map((employee) => {
    const raw = String(formData.get(`target-${employee.employeeId}`) ?? "").trim();

    if (!raw) {
      return {
        employeeId: employee.employeeId,
        targetWeeklyHours: undefined,
      };
    }

    const value = Number(raw);

    if (!Number.isFinite(value) || value < 0 || value > 168) {
      redirect("/app/schedule/settings?error=invalid_hours");
    }

    return {
      employeeId: employee.employeeId,
      targetWeeklyHours: Math.round(value * 4) / 4,
    };
  });

  await Promise.all([
    saveLocationStaffingSettings(staffingSettings),
    saveEmployeeHourTargets(hourTargets),
  ]);

  revalidatePath("/app/schedule");
  revalidatePath("/app/schedule/settings");
  redirect("/app/schedule/settings?saved=1");
}
