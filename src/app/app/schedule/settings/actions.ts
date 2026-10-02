"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { timeMinutes } from "@/lib/scheduling/periods";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import {
  createCoverageWindow,
  deleteCoverageWindow,
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
      requiresDesignatedLead:
        formData.get(`lead-${location.locationId}`) === "on",
    };
  });

  const hourTargets = employees.map((employee) => {
    const raw = String(
      formData.get(`target-${employee.employeeId}`) ?? "",
    ).trim();
    const maximumRaw = String(
      formData.get(`maximum-${employee.employeeId}`) ?? "",
    ).trim();
    const targetWeeklyHours = raw ? Number(raw) : undefined;
    const maximumWeeklyHours = Number(maximumRaw);
    if (
      !maximumRaw ||
      !Number.isFinite(maximumWeeklyHours) ||
      maximumWeeklyHours < 0 ||
      maximumWeeklyHours > 168 ||
      (targetWeeklyHours !== undefined &&
        (!Number.isFinite(targetWeeklyHours) ||
          targetWeeklyHours < 0 ||
          targetWeeklyHours > 168))
    )
      redirect("/app/schedule/settings?error=invalid_hours");
    return {
      employeeId: employee.employeeId,
      targetWeeklyHours:
        targetWeeklyHours === undefined
          ? undefined
          : Math.round(targetWeeklyHours * 4) / 4,
      maximumWeeklyHours: Math.round(maximumWeeklyHours * 4) / 4,
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


export async function addCoverageWindowAction(formData: FormData) {
  await requireRoles(MANAGER_ROLES);

  const locationId = String(formData.get("locationId") ?? "");
  const dayOfWeek = Number(formData.get("dayOfWeek"));
  const startTime = String(formData.get("startTime") ?? "");
  const endInput = String(formData.get("endTime") ?? "");
  const endTime = endInput === "00:00" ? "24:00" : endInput;
  const minimumRaw = String(formData.get("minimumStaff") ?? "").trim();
  const minimumStaff = minimumRaw ? Number(minimumRaw) : undefined;

  let validTimes = true;
  try { timeMinutes(startTime); timeMinutes(endTime, true); } catch { validTimes = false; }
  if (
    !validTimes ||
    !locationId ||
    !Number.isInteger(dayOfWeek) ||
    dayOfWeek < 0 ||
    dayOfWeek > 6 ||
    !/^\d{2}:\d{2}$/.test(startTime) ||
    !/^\d{2}:\d{2}$/.test(endTime) ||
    startTime >= endTime ||
    (minimumStaff !== undefined &&
      (!Number.isInteger(minimumStaff) ||
        minimumStaff < 1 ||
        minimumStaff > 100))
  ) {
    redirect("/app/schedule/settings?error=invalid_window");
  }

  try {
    await createCoverageWindow({
      locationId,
      dayOfWeek,
      startTime,
      endTime,
      minimumStaff,
    });
  } catch {
    redirect("/app/schedule/settings?error=duplicate_window");
  }

  revalidatePath("/app/schedule");
  revalidatePath("/app/schedule/settings");
  redirect("/app/schedule/settings?windowSaved=1");
}

export async function deleteCoverageWindowAction(formData: FormData) {
  await requireRoles(MANAGER_ROLES);
  const windowId = String(formData.get("windowId") ?? "");

  if (!windowId) {
    redirect("/app/schedule/settings?error=invalid_window");
  }

  await deleteCoverageWindow(windowId);
  revalidatePath("/app/schedule");
  revalidatePath("/app/schedule/settings");
  redirect("/app/schedule/settings?windowDeleted=1");
}
