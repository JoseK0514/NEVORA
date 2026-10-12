"use server";

import { requireSessionMutationProof } from "@/lib/auth/session";
import { getSchedulePublishReadiness } from "@/lib/data/schedule-publication-review";

import { getWorkspace, WorkspaceConcurrencyError } from "@/lib/data/workspaces";
import { localDateTimeToInstant, shiftBoundaryInstants } from "@/lib/business-time";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { isDateInWeek, isValidWeekStart } from "@/lib/date-utils";
import { setAvailabilityDeadline } from "@/lib/data/week-settings";
import { publishScheduleWithRevision } from "@/lib/data/publication-revisions";
import { listEmployees } from "@/lib/data/employees";
import {
  deleteShift,
  ensureSchedule,
  getShiftForManagement,
  getShiftValidationContext,
  insertShift,
  listWeekShifts,
  updateShift,
} from "@/lib/data/schedules";
import { executeScheduleCopy } from "@/lib/data/schedule-copy";
import { prepareExchangeContext } from "@/lib/scheduling/exchange-validation";
import { validateShift } from "@/lib/scheduling/validate-shift";
import { ManualAssignmentConflictError } from "@/lib/data/manual-assignment-validation";

function scheduleUrl(weekStart: string, suffix = "") {
  return `/app/schedule?week=${encodeURIComponent(weekStart)}${suffix}`;
}

export async function createShiftAction(formData: FormData) {
  const session = await requireRoles(MANAGER_ROLES);
  const proof = await requireSessionMutationProof();

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
    return { error: blockingIssue.message, issueCode: blockingIssue.code };
  }

  try {
    const scheduleId = await ensureSchedule({
      locationId,
      weekStart,
      createdBy: session.id,
      proof,
    });

    await insertShift({
      actorEmployeeId: session.id,
      proof,
      scheduleId,
      employeeId,
      date,
      startTime,
      endTime,
      notes: notes || undefined,
      positionId,
      isDesignatedLead,
    });
  } catch (error) {
    if (error instanceof ManualAssignmentConflictError) return { error: error.message, issueCode: error.code };
    throw error;
  }

  revalidatePath("/app/schedule");

  const warning = validation.issues.find((issue) => issue.severity === "warning");
  redirect(
    scheduleUrl(
      weekStart,
      `&location=${encodeURIComponent(locationId)}${warning ? `&warning=${encodeURIComponent(warning.code)}` : ""}`,
    ),
  );
}

export async function publishScheduleAction(formData: FormData) {
  const session = await requireRoles(MANAGER_ROLES);
  const proof = await requireSessionMutationProof();
  const weekStart = String(formData.get("weekStart") ?? "");
  const locationId = String(formData.get("locationId") ?? "");
  const confirmWarnings = formData.get("confirmWarnings") === "yes";

  if (!isValidWeekStart(weekStart) || !locationId) {
    redirect("/app/schedule?error=INVALID_PUBLISH");
  }

  if (!confirmWarnings) {
    const readiness = await getSchedulePublishReadiness(weekStart, locationId);
    if (readiness.hasWarnings) {
      redirect(
        scheduleUrl(
          weekStart,
          `&location=${encodeURIComponent(locationId)}&publishCheck=${encodeURIComponent(locationId)}`,
        ),
      );
    }
  }

  const { published } = await publishScheduleWithRevision({
    locationId,
    weekStart,
    managerId: session.id,
    proof,
  });

  revalidatePath("/app/schedule");
  redirect(
    scheduleUrl(
      weekStart,
      `&location=${encodeURIComponent(locationId)}${published
        ? `&published=${encodeURIComponent(locationId)}`
        : "&error=NO_SCHEDULE"}`,
    ),
  );
}


export async function updateShiftAction(formData: FormData) {
  const session = await requireRoles(MANAGER_ROLES);
  const proof = await requireSessionMutationProof();

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
    return { error: blocking.message, issueCode: blocking.code };
  }

  let updated: boolean;
  try {
    updated = await updateShift({
      actorEmployeeId: session.id,
      proof,
      shiftId,
      employeeId,
      date,
      startTime,
      endTime,
      notes: notes || undefined,
      positionId,
      isDesignatedLead,
    });
  } catch (error) {
    if (error instanceof ManualAssignmentConflictError) return { error: error.message, issueCode: error.code };
    throw error;
  }

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
  const proof = await requireSessionMutationProof();
  const shiftId = String(formData.get("shiftId") ?? "");
  const existing = await getShiftForManagement(shiftId);

  if (!existing) {
    redirect("/app/schedule?error=INVALID_SHIFT");
  }

  const deleted = await deleteShift(shiftId, proof);

  if (!deleted) {
    redirect(
      scheduleUrl(existing.weekStart, "&error=SHIFT_HAS_EXCHANGE_HISTORY"),
    );
  }

  revalidatePath("/app/schedule");
  redirect(scheduleUrl(existing.weekStart, "&deleted=1"));
}

export async function copyPreviousWeekAction(formData: FormData) {
 await requireRoles(MANAGER_ROLES);
 const proof=await requireSessionMutationProof();
 const receipt=await executeScheduleCopy(proof,{operationId:String(formData.get('operationId')??''),kind:'PREVIOUS_WEEK',weekStart:String(formData.get('weekStart')??'')});
 revalidatePath('/app/schedule');
 redirect(`/app/schedule/copy-receipt?operation=${receipt.operationId}`);
}

export async function setAvailabilityDeadlineAction(formData: FormData) {
  const session = await requireRoles(MANAGER_ROLES);
  const proof = await requireSessionMutationProof();
  const weekStart = String(formData.get("weekStart") ?? "");
  const deadlineLocal = String(formData.get("availabilityDeadline") ?? "").trim();

  if (
    !isValidWeekStart(weekStart)
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
      proof,
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
