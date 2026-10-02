"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { addDays, weekStartFor } from "@/lib/date-utils";
import {
  archiveScheduleTemplate,
  createTemplateFromWeek,
  listTemplateShifts,
} from "@/lib/data/schedule-templates";
import {
  ensureSchedule,
  getShiftValidationContext,
  insertShift,
} from "@/lib/data/schedules";
import { clearWeekAcknowledgements } from "@/lib/data/acknowledgements";
import { validateShift } from "@/lib/scheduling/validate-shift";

function templateUrl(weekStart: string, suffix = "") {
  return `/app/schedule/templates?week=${encodeURIComponent(weekStart)}${suffix}`;
}

export async function saveTemplateAction(formData: FormData) {
  const session = await requireRoles(MANAGER_ROLES);
  const weekStart = String(formData.get("weekStart") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (
    weekStartFor(weekStart) !== weekStart ||
    name.length < 3 ||
    name.length > 50
  ) {
    redirect(templateUrl(weekStart, "&error=invalid"));
  }

  try {
    await createTemplateFromWeek({
      name,
      weekStart,
      createdBy: session.id,
    });
  } catch {
    redirect(templateUrl(weekStart, "&error=save"));
  }

  revalidatePath("/app/schedule/templates");
  redirect(templateUrl(weekStart, "&saved=1"));
}

export async function applyTemplateAction(formData: FormData) {
  const session = await requireRoles(MANAGER_ROLES);
  const weekStart = String(formData.get("weekStart") ?? "");
  const templateId = String(formData.get("templateId") ?? "");

  if (weekStartFor(weekStart) !== weekStart || !templateId) {
    redirect(templateUrl(weekStart, "&error=invalid"));
  }

  const templateShifts = await listTemplateShifts(templateId);

  let applied = 0;
  let skipped = 0;
  let warnings = 0;

  for (const templateShift of templateShifts) {
    if (!templateShift.employeeId) {
      skipped += 1;
      continue;
    }

    const date = addDays(weekStart, templateShift.dayOffset);
    const context = await getShiftValidationContext({
      employeeId: templateShift.employeeId,
      date,
      weekStart,
    });

    if (!context) {
      skipped += 1;
      continue;
    }


    const validation = validateShift({
      candidate: {
        employeeId: templateShift.employeeId,
        locationId: templateShift.locationId,
        date,
        startTime: templateShift.startTime,
        endTime: templateShift.endTime,
        isDesignatedLead: templateShift.isDesignatedLead,
      },
      ...context,
      mode: "MANAGER_SCHEDULE",
    });

    if (validation.issues.some((issue) => issue.severity === "error")) {
      skipped += 1;
      continue;
    }

    const scheduleId = await ensureSchedule({
      locationId: templateShift.locationId,
      weekStart,
      createdBy: session.id,
    });

    await insertShift({
      scheduleId,
      employeeId: templateShift.employeeId,
      date,
      startTime: templateShift.startTime,
      endTime: templateShift.endTime,
      notes: templateShift.notes,
      isDesignatedLead: templateShift.isDesignatedLead,
    });

    applied += 1;

    if (validation.issues.some((issue) => issue.severity === "warning")) {
      warnings += 1;
    }
  }

  if (applied) {
    await clearWeekAcknowledgements(weekStart);
  }

  revalidatePath("/app/schedule");
  revalidatePath("/app/schedule/templates");
  redirect(
    templateUrl(
      weekStart,
      `&applied=${applied}&skipped=${skipped}&warnings=${warnings}`,
    ),
  );
}

export async function archiveTemplateAction(formData: FormData) {
  await requireRoles(MANAGER_ROLES);
  const weekStart = String(formData.get("weekStart") ?? "");
  const templateId = String(formData.get("templateId") ?? "");

  if (!templateId) {
    redirect(templateUrl(weekStart, "&error=invalid"));
  }

  await archiveScheduleTemplate(templateId);
  revalidatePath("/app/schedule/templates");
  redirect(templateUrl(weekStart, "&archived=1"));
}
