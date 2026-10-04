"use server";

import { listPositions } from "@/lib/data/positions";

import { getWorkspace, WorkspaceConcurrencyError } from "@/lib/data/workspaces";
import { localDateTimeToInstant, shiftBoundaryInstants } from "@/lib/business-time";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { addDays, isDateInWeek, weekStartFor } from "@/lib/date-utils";
import { setAvailabilityDeadline } from "@/lib/data/week-settings";
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
  const positionId = formData.has("positionId") ? String(formData.get("positionId") ?? "").trim() || null : undefined;
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

  const workspace = await getWorkspace();
  try { shiftBoundaryInstants({ date, startTime, endTime }, workspace.timeZone); }
  catch { redirect(scheduleUrl(weekStart, "&error=INVALID_SHIFT")); }

  const context = await getShiftValidationContext({
    employeeId,
    locationId,
    positionId: positionId || undefined,
    date,
    weekStart,
  });

  if (!context) {
    redirect(scheduleUrl(weekStart, "&error=EMPLOYEE_NOT_FOUND"));
  }


  const validation = validateShift({
    candidate: { employeeId, locationId, positionId:positionId || undefined, date, startTime, endTime, isDesignatedLead },
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
    actorEmployeeId: session.id,
    scheduleId,
    employeeId,
    date,
    startTime,
    endTime,
    notes: notes || undefined,
    positionId,
    isDesignatedLead,
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
  const confirmWarnings = formData.get("confirmWarnings") === "yes";

  if (!weekStart || !locationId) {
    redirect("/app/schedule?error=INVALID_PUBLISH");
  }

  if (!confirmWarnings) {
    const [shifts, employees, staffing, targets, coverageWindows] =
      await Promise.all([
        listWeekShifts({ weekStart, byBusinessWorkweek: true }),
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
      positions: await listPositions({includeInactive:true}),
      shifts: effectiveShifts.map((shift) => ({
        id: shift.id,
        employeeId: shift.employeeId,
        employeeName: shift.employeeName,
        locationId: shift.locationId,
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        positionId: shift.positionId,
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
          eligibleLocationIds: employee.eligibleLocationIds,
          positionIds: employee.positionIds,
          role: employee.role,
          active: employee.active,
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
  const session = await requireRoles(MANAGER_ROLES);

  const shiftId = String(formData.get("shiftId") ?? "");
  const employeeId = String(formData.get("employeeId") ?? "").trim().toUpperCase();
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  const positionId = formData.has("positionId") ? String(formData.get("positionId") ?? "").trim() || null : undefined;
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

  const workspace = await getWorkspace();
  try { shiftBoundaryInstants({ date, startTime, endTime }, workspace.timeZone); }
  catch { redirect(`/app/schedule/edit?shiftId=${encodeURIComponent(shiftId)}&error=INVALID_SHIFT`); }

  const context = await getShiftValidationContext({
    employeeId,
    locationId: existing.locationId,
    positionId: positionId === undefined ? existing.positionId : positionId || undefined,
    date,
    weekStart: existing.weekStart,
  });

  if (!context) {
    redirect(scheduleUrl(existing.weekStart, "&error=EMPLOYEE_NOT_FOUND"));
  }


  const adjusted =
    employeeId === existing.employeeId
      ? prepareExchangeContext(
          context,
          existing,
        )
      : context;

  const validation = validateShift({
    candidate: {
      employeeId,
      locationId: existing.locationId,
      positionId: positionId === undefined ? existing.positionId : positionId || undefined,
      date,
      startTime,
      endTime,
      isDesignatedLead,
    },
    ...adjusted,
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
    actorEmployeeId: session.id,
    shiftId,
    employeeId,
    date,
    startTime,
    endTime,
    notes: notes || undefined,
    positionId,
    isDesignatedLead,
  });

  if (!updated) {
    redirect(scheduleUrl(existing.weekStart, "&error=INVALID_SHIFT"));
  }

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
  const session = await requireRoles(MANAGER_ROLES);
  const shiftId = String(formData.get("shiftId") ?? "");
  const existing = await getShiftForManagement(shiftId);

  if (!existing) {
    redirect("/app/schedule?error=INVALID_SHIFT");
  }

  const deleted = await deleteShift(shiftId, session.id);

  if (!deleted) {
    redirect(
      scheduleUrl(existing.weekStart, "&error=SHIFT_HAS_EXCHANGE_HISTORY"),
    );
  }

  revalidatePath("/app/schedule");
  redirect(scheduleUrl(existing.weekStart, "&deleted=1"));
}

export async function copyPreviousWeekAction(formData: FormData) {
  const session = await requireRoles(MANAGER_ROLES);
  const targetWeekStart = String(formData.get("weekStart") ?? "");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetWeekStart)) {
    redirect("/app/schedule?error=INVALID_SHIFT");
  }

  const workspace = await getWorkspace();
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

    try { shiftBoundaryInstants({ ...shift, date }, workspace.timeZone); }
    catch { skipped += 1; continue; }

    const context = await getShiftValidationContext({
      employeeId: shift.employeeId,
      locationId: shift.locationId,
      positionId: shift.positionId,
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
        positionId: shift.positionId,
        date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        isDesignatedLead: shift.isDesignatedLead,
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
      actorEmployeeId: session.id,
      scheduleId,
      employeeId: shift.employeeId,
      date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      notes: shift.notes,
      positionId: shift.positionId,
      isDesignatedLead: shift.isDesignatedLead,
    });

    copied += 1;

    if (validation.issues.some((issue) => issue.severity === "warning")) {
      warnings += 1;
    }
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
  const conversionWorkspace = deadlineLocal ? await getWorkspace() : undefined;

  if (deadlineLocal && conversionWorkspace) {
    try { deadlineIso = localDateTimeToInstant(deadlineLocal, conversionWorkspace.timeZone); }
    catch { redirect(scheduleUrl(weekStart, `&error=INVALID_DEADLINE&availabilityDeadline=${encodeURIComponent(deadlineLocal)}`)); }
  }

  try {
    await setAvailabilityDeadline({
      weekStart,
      deadlineIso,
      conversionWorkspace,
      updatedBy: session.id,
    });
  } catch (error) {
    if (error instanceof WorkspaceConcurrencyError) {
      redirect(scheduleUrl(weekStart, `&error=DEADLINE_WORKSPACE_CHANGED&availabilityDeadline=${encodeURIComponent(deadlineLocal)}`));
    }
    throw error;
  }

  revalidatePath("/app/schedule");
  revalidatePath("/app/availability");
  redirect(scheduleUrl(weekStart, "&deadlineSaved=1"));
}
