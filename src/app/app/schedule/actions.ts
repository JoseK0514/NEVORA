"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { isDateInWeek } from "@/lib/date-utils";
import {
  ensureSchedule,
  getShiftValidationContext,
  insertShift,
  publishSchedule,
} from "@/lib/data/schedules";
import { validateShift } from "@/lib/scheduling/validate-shift";

function scheduleUrl(weekStart: string, suffix = "") {
  return `/app/schedule?week=${encodeURIComponent(weekStart)}${suffix}`;
}

export async function createShiftAction(formData: FormData) {
  const session = await requireRoles(MANAGER_ROLES);

  const weekStart = String(formData.get("weekStart") ?? "");
  const employeeId = String(formData.get("employeeId") ?? "").trim().toUpperCase();
  const locationId = String(formData.get("locationId") ?? "");
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (
    !weekStart ||
    !employeeId ||
    !locationId ||
    !date ||
    !startTime ||
    !endTime ||
    !isDateInWeek(date, weekStart)
  ) {
    redirect(scheduleUrl(weekStart || date, "&error=INVALID_SHIFT"));
  }

  const context = await getShiftValidationContext({
    employeeId,
    date,
    weekStart,
  });

  if (!context) {
    redirect(scheduleUrl(weekStart, "&error=EMPLOYEE_NOT_FOUND"));
  }

  const validation = validateShift({
    candidate: { employeeId, locationId, date, startTime, endTime },
    ...context,
    mode: "MANAGER_SCHEDULE",
  });

  const blockingIssue = validation.issues.find((issue) => issue.severity === "error");

  if (blockingIssue) {
    redirect(
      scheduleUrl(
        weekStart,
        `&error=${encodeURIComponent(blockingIssue.code)}`,
      ),
    );
  }

  const scheduleId = await ensureSchedule({
    locationId,
    weekStart,
    createdBy: session.id,
  });

  await insertShift({
    scheduleId,
    employeeId,
    date,
    startTime,
    endTime,
    notes: notes || undefined,
  });

  revalidatePath("/app/schedule");

  const warning = validation.issues.find((issue) => issue.severity === "warning");
  redirect(
    scheduleUrl(
      weekStart,
      warning ? `&warning=${encodeURIComponent(warning.code)}` : "",
    ),
  );
}

export async function publishScheduleAction(formData: FormData) {
  const session = await requireRoles(MANAGER_ROLES);
  const weekStart = String(formData.get("weekStart") ?? "");
  const locationId = String(formData.get("locationId") ?? "");

  if (!weekStart || !locationId) {
    redirect("/app/schedule?error=INVALID_PUBLISH");
  }

  const published = await publishSchedule({
    locationId,
    weekStart,
    managerId: session.id,
  });

  revalidatePath("/app/schedule");
  redirect(
    scheduleUrl(
      weekStart,
      published
        ? `&published=${encodeURIComponent(locationId)}`
        : "&error=NO_SCHEDULE",
    ),
  );
}
