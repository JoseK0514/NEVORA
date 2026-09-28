"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { addDays, isDateInWeek, weekStartFor } from "@/lib/date-utils";
import { setAvailabilityDeadline } from "@/lib/data/week-settings";
import { clearWeekAcknowledgements } from "@/lib/data/acknowledgements";
import { publishScheduleWithRevision } from "@/lib/data/publication-revisions";
import { listEmployees } from "@/lib/data/employees";
import {
  listCoverageWindows,
  listEmployeeHourTargets,
  listLocationStaffingSettings,
} from "@/lib/data/schedule-health";
import { calculateScheduleHealth } from "@/lib/scheduling/schedule-health";
import { buildPublishReadiness } from "@/lib/scheduling/publish-readiness";
import { weekDates } from "@/lib/date-utils";
import {
  deleteShift,
  ensureSchedule,
  getShiftForManagement,
  getShiftValidationContext,
  insertShift,
  listWeekShifts,
  updateShift,
} from "@/lib/data/schedules";
import { copyShiftDate } from "@/lib/scheduling/copy-week";
import { prepareExchangeContext } from "@/lib/scheduling/exchange-validation";
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
  const isDesignatedLead = formData.get("isDesignatedLead") === "on";

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

  if (
    isDesignatedLead &&
    !["OWNER", "MANAGER", "LEAD"].includes(context.employee.role)
  ) {
    redirect(scheduleUrl(weekStart, "&error=INVALID_SHIFT_LEAD"));
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
    isDesignatedLead,
  });

  await clearWeekAcknowledgements(weekStart);
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
  const confirmWarnings = formData.get("confirmWarnings") === "yes";

  if (!weekStart || !locationId) {
    redirect("/app/schedule?error=INVALID_PUBLISH");
  }

  if (!confirmWarnings) {
    const [shifts, employees, staffing, targets, coverageWindows] =
      await Promise.all([
        listWeekShifts({ weekStart }),
        listEmployees(),
        listLocationStaffingSettings(),
        listEmployeeHourTargets(),
        listCoverageWindows(),
      ]);

    const targetMap = new Map(
      targets.map((target) => [target.employeeId, target.targetWeeklyHours]),
    );
    const effectiveShifts = shifts.filter((shift) => !shift.isCalloutApproved);
    const health = calculateScheduleHealth({
      shifts: effectiveShifts.map((shift) => ({
        id: shift.id,
        employeeId: shift.employeeId,
        employeeName: shift.employeeName,
        locationId: shift.locationId,
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        isDesignatedLead: shift.isDesignatedLead,
      })),
      locations: staffing.map((setting) => ({
        id: setting.locationId,
        name: setting.locationName,
        minimumStaffPerShift: setting.minimumStaffPerShift,
        requiresDesignatedLead: setting.requiresDesignatedLead,
      })),
      employees: employees
        .filter((employee) => employee.active)
        .map((employee) => ({
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          targetWeeklyHours: targetMap.get(employee.id),
        })),
      coverageWindows,
      weekDates: weekDates(weekStart),
    });

    const readiness = buildPublishReadiness({
      locationId,
      locationCoverage: health.locationCoverage,
      underTargetCount: health.underTargetCount,
      overTargetCount: health.overTargetCount,
      unconfiguredTargetCount: health.unconfiguredTargetCount,
    });

    if (readiness.hasWarnings) {
      redirect(
        scheduleUrl(
          weekStart,
          `&publishCheck=${encodeURIComponent(locationId)}`,
        ),
      );
    }
  }

  const { published } = await publishScheduleWithRevision({
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


export async function updateShiftAction(formData: FormData) {
  await requireRoles(MANAGER_ROLES);

  const shiftId = String(formData.get("shiftId") ?? "");
  const employeeId = String(formData.get("employeeId") ?? "").trim().toUpperCase();
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  const isDesignatedLead = formData.get("isDesignatedLead") === "on";

  const existing = await getShiftForManagement(shiftId);

  if (
    !existing ||
    !employeeId ||
    !date ||
    !startTime ||
    !endTime ||
    !isDateInWeek(date, existing.weekStart)
  ) {
    redirect("/app/schedule?error=INVALID_SHIFT");
  }

  const context = await getShiftValidationContext({
    employeeId,
    date,
    weekStart: existing.weekStart,
  });

  if (!context) {
    redirect(scheduleUrl(existing.weekStart, "&error=EMPLOYEE_NOT_FOUND"));
  }

  if (
    isDesignatedLead &&
    !["OWNER", "MANAGER", "LEAD"].includes(context.employee.role)
  ) {
    redirect(
      `/app/schedule/edit?shiftId=${encodeURIComponent(
        shiftId,
      )}&error=INVALID_SHIFT_LEAD`,
    );
  }

  const adjusted =
    employeeId === existing.employeeId
      ? prepareExchangeContext(
          {
            existingShifts: context.existingShifts,
            existingWeeklyMinutes: context.existingWeeklyMinutes,
          },
          existing,
        )
      : {
          existingShifts: context.existingShifts,
          existingWeeklyMinutes: context.existingWeeklyMinutes,
        };

  const validation = validateShift({
    candidate: {
      employeeId,
      locationId: existing.locationId,
      date,
      startTime,
      endTime,
    },
    employee: context.employee,
    existingShifts: adjusted.existingShifts,
    availability: context.availability,
    approvedTimeOff: context.approvedTimeOff,
    existingWeeklyMinutes: adjusted.existingWeeklyMinutes,
    mode: "MANAGER_SCHEDULE",
  });

  const blocking = validation.issues.find((issue) => issue.severity === "error");

  if (blocking) {
    redirect(
      `/app/schedule/edit?shiftId=${encodeURIComponent(
        shiftId,
      )}&error=${encodeURIComponent(blocking.code)}`,
    );
  }

  const updated = await updateShift({
    shiftId,
    employeeId,
    date,
    startTime,
    endTime,
    notes: notes || undefined,
    isDesignatedLead,
  });

  if (!updated) {
    redirect(scheduleUrl(existing.weekStart, "&error=INVALID_SHIFT"));
  }

  await clearWeekAcknowledgements(existing.weekStart);
  revalidatePath("/app/schedule");
  const warning = validation.issues.find((issue) => issue.severity === "warning");

  redirect(
    scheduleUrl(
      existing.weekStart,
      `&updated=1${warning ? `&warning=${encodeURIComponent(warning.code)}` : ""}`,
    ),
  );
}

export async function deleteShiftAction(formData: FormData) {
  await requireRoles(MANAGER_ROLES);
  const shiftId = String(formData.get("shiftId") ?? "");
  const existing = await getShiftForManagement(shiftId);

  if (!existing) {
    redirect("/app/schedule?error=INVALID_SHIFT");
  }

  const deleted = await deleteShift(shiftId);

  if (!deleted) {
    redirect(
      scheduleUrl(existing.weekStart, "&error=SHIFT_HAS_EXCHANGE_HISTORY"),
    );
  }

  await clearWeekAcknowledgements(existing.weekStart);
  revalidatePath("/app/schedule");
  redirect(scheduleUrl(existing.weekStart, "&deleted=1"));
}

export async function copyPreviousWeekAction(formData: FormData) {
  const session = await requireRoles(MANAGER_ROLES);
  const targetWeekStart = String(formData.get("weekStart") ?? "");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetWeekStart)) {
    redirect("/app/schedule?error=INVALID_SHIFT");
  }

  const sourceWeekStart = addDays(targetWeekStart, -7);
  const sourceShifts = await listWeekShifts({ weekStart: sourceWeekStart });

  let copied = 0;
  let skipped = 0;
  let warnings = 0;

  for (const shift of sourceShifts) {
    const date = copyShiftDate(
      sourceWeekStart,
      shift.date,
      targetWeekStart,
    );

    const context = await getShiftValidationContext({
      employeeId: shift.employeeId,
      date,
      weekStart: targetWeekStart,
    });

    if (!context) {
      skipped += 1;
      continue;
    }

    const validation = validateShift({
      candidate: {
        employeeId: shift.employeeId,
        locationId: shift.locationId,
        date,
        startTime: shift.startTime,
        endTime: shift.endTime,
      },
      ...context,
      mode: "MANAGER_SCHEDULE",
    });

    if (validation.issues.some((issue) => issue.severity === "error")) {
      skipped += 1;
      continue;
    }

    const scheduleId = await ensureSchedule({
      locationId: shift.locationId,
      weekStart: targetWeekStart,
      createdBy: session.id,
    });

    await insertShift({
      scheduleId,
      employeeId: shift.employeeId,
      date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      notes: shift.notes,
      isDesignatedLead: shift.isDesignatedLead,
    });

    copied += 1;

    if (validation.issues.some((issue) => issue.severity === "warning")) {
      warnings += 1;
    }
  }

  if (copied > 0) {
    await clearWeekAcknowledgements(targetWeekStart);
  }

  revalidatePath("/app/schedule");
  redirect(
    scheduleUrl(
      targetWeekStart,
      `&copied=${copied}&skipped=${skipped}&copyWarnings=${warnings}`,
    ),
  );
}


export async function setAvailabilityDeadlineAction(formData: FormData) {
  const session = await requireRoles(MANAGER_ROLES);
  const weekStart = String(formData.get("weekStart") ?? "");
  const deadlineLocal = String(formData.get("availabilityDeadline") ?? "").trim();

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(weekStart) ||
    weekStartFor(weekStart) !== weekStart
  ) {
    redirect("/app/schedule?error=INVALID_SHIFT");
  }

  let deadlineIso: string | undefined;

  if (deadlineLocal) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(deadlineLocal)) {
      redirect(scheduleUrl(weekStart, "&error=INVALID_DEADLINE"));
    }

    const parsed = new Date(`${deadlineLocal}:00-04:00`);
    if (Number.isNaN(parsed.getTime())) {
      redirect(scheduleUrl(weekStart, "&error=INVALID_DEADLINE"));
    }
    deadlineIso = parsed.toISOString();
  }

  await setAvailabilityDeadline({
    weekStart,
    deadlineIso,
    updatedBy: session.id,
  });

  revalidatePath("/app/schedule");
  revalidatePath("/app/availability");
  redirect(scheduleUrl(weekStart, "&deadlineSaved=1"));
}
