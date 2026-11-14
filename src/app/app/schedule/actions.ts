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
import { publishScheduleChanges, publishScheduleWithRevision } from "@/lib/data/publication-revisions";
import {
  deleteShift,
  createCoverageRepairShift,
  getShiftForManagement,
  getShiftValidationContext,
  insertShiftAtLocation,
  listScheduleStatuses,
  updateShift,
} from "@/lib/data/schedules";
import { executeScheduleCopy } from "@/lib/data/schedule-copy";
import { prepareExchangeContext } from "@/lib/scheduling/exchange-validation";
import { validateShift } from "@/lib/scheduling/validate-shift";
import { ManualAssignmentConflictError } from "@/lib/data/manual-assignment-validation";
import {assertOperationalAccess,assertOriginalOperationalAccess,isOperationalAuthorizationError} from '@/lib/company-access/operational-scope.server';
import {isManagementAuthorizationError} from '@/lib/data/management-session';
import {readOperationalShiftEditor} from '@/lib/company-access/operational-read.server';
import { coverageRepairUrl, CoverageRepairConflictError } from "@/lib/scheduling/coverage-repair";

function scheduleUrl(weekStart: string, suffix = "") {
  return `/app/schedule?week=${encodeURIComponent(weekStart)}${suffix}`;
}

/** W2: after a save or delete, return to the shift's own location, day and person. */
function shiftReturnUrl(shift: { weekStart: string; locationId: string; date: string; employeeId: string }, suffix = "") {
  return `${scheduleUrl(shift.weekStart, `&location=${encodeURIComponent(shift.locationId)}&day=${encodeURIComponent(shift.date)}${suffix}`)}#schedule-employee-${encodeURIComponent(shift.employeeId)}`;
}

const accessError=()=>({error:'Operational access is unavailable. Reload and try again.',issueCode:'ACCESS_DENIED'});
const denied=(error:unknown)=>isOperationalAuthorizationError(error)||isManagementAuthorizationError(error);
/** Re-check the original scope after awaited work; a role alone cannot prove unchanged access. */
async function currentAdmission(proof:Awaited<ReturnType<typeof requireSessionMutationProof>>,original:Awaited<ReturnType<typeof assertOperationalAccess>>){
 try{await assertOriginalOperationalAccess(proof,original);return true;}
 catch(error){if(denied(error))return false;throw error;}
}


/**
 * Converts the manager form into a validated assignment in workspace local time.
 * UI validation gives actionable issues; the data writer must also revalidate
 * current authority and assignment facts when committing. Errors may return to
 * the form, while committed saves revalidate and redirect to the affected row.
 */
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

  let admission:Awaited<ReturnType<typeof assertOperationalAccess>>;
  try{admission=await assertOperationalAccess(proof,{kind:'LOCATIONS',locationIds:[locationId]});}
  catch(error){if(denied(error))return accessError();throw error;}
  const company=admission.scope.mode==='COMPANY';

  if (formData.has('coverageRepairReview')) {
    let saved;
    try {
      saved = await createCoverageRepairShift({ review: String(formData.get('coverageRepairReview') ?? ''),
        weekStart, employeeId, locationId, date, startTime, endTime, positionId, isDesignatedLead, publicationConsent: formData.get('publicationConsent') === 'on', actorEmployeeId: session.id, proof });
    } catch (error) {
      if(denied(error))return accessError();
      if (error instanceof CoverageRepairConflictError || error instanceof ManualAssignmentConflictError){if(!await currentAdmission(proof,admission))return accessError();return {error:error.message,issueCode:error.code};}
      throw error;
    }
    if(!await currentAdmission(proof,admission))return accessError();
    revalidatePath('/app/schedule');
    redirect(`${coverageRepairUrl(saved.locator, true)}&saved=1`);
  }

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

  // Restricted forms may select only the minimal current editor options. The
  // complete canonical rule source remains server-private inside the writer.
  if(!company){
    const editor=await readOperationalShiftEditor(proof,{weekStart,locationId});
    if(editor.state!=='ready'||editor.data.saveAvailability!=='available'
      ||!editor.data.employeeOptions.some(e=>e.id===employeeId)
      ||(positionId&&!editor.data.positionOptions.some(p=>p.id===positionId)))return accessError();
  }
  let validation:ReturnType<typeof validateShift>|undefined;
  if(company){
    const context=await getShiftValidationContext({employeeId,locationId,positionId:positionId||undefined,date,weekStart});
    if(!context){if(!await currentAdmission(proof,admission))return accessError();redirect(scheduleUrl(weekStart,"&error=EMPLOYEE_NOT_FOUND"));}
    validation=validateShift({candidate:{employeeId,locationId,positionId:positionId||undefined,date,startTime,endTime,isDesignatedLead},...context,mode:'MANAGER_SCHEDULE'});
    const blocking=validation.issues.find(issue=>issue.severity==='error');
    if(!await currentAdmission(proof,admission))return accessError();
    if(blocking)return {error:blocking.message,issueCode:blocking.code};
  }
  try{
    await insertShiftAtLocation({actorEmployeeId:session.id,proof,locationId,weekStart,employeeId,date,startTime,endTime,notes:notes||undefined,positionId,isDesignatedLead});
  }catch(error){
    if(denied(error))return accessError();
    if(error instanceof ManualAssignmentConflictError){if(company&&!await currentAdmission(proof,admission))return accessError();return company?{error:error.message,issueCode:error.code}:{error:'Assignment is unavailable. Reload and try again.',issueCode:'SOURCE_CHANGED'};}
    throw error;
  }

  if(company&&!await currentAdmission(proof,admission))return accessError();
  revalidatePath("/app/schedule");

  const warning = validation?.issues.find((issue) => issue.severity === "warning");
  redirect(
    shiftReturnUrl(
      { weekStart, locationId, date, employeeId },
      warning ? `&warning=${encodeURIComponent(warning.code)}` : "",
    ),
  );
}

/**
 * Publishes one location/week through the revision writer. Warning confirmation
 * is a review step, not a bypass of transactional publication guards. Re-check
 * original company access after reads/writes before exposing their result.
 */
export async function publishScheduleAction(formData: FormData) {
  const session = await requireRoles(MANAGER_ROLES);
  const proof = await requireSessionMutationProof();
  const weekStart = String(formData.get("weekStart") ?? "");
  const locationId = String(formData.get("locationId") ?? "");
  const confirmWarnings = formData.get("confirmWarnings") === "yes";
  let admission:Awaited<ReturnType<typeof assertOperationalAccess>>;
  try{admission=await assertOperationalAccess(proof,{kind:'COMPANY'});}catch(error){if(denied(error))redirect('/app/schedule?error=ACCESS_DENIED');throw error;}

  if (!isValidWeekStart(weekStart) || !locationId) {
    redirect("/app/schedule?error=INVALID_PUBLISH");
  }

  if (!confirmWarnings) {
    const readiness = await getSchedulePublishReadiness(weekStart, locationId);
    if(!await currentAdmission(proof,admission))redirect('/app/schedule?error=ACCESS_DENIED');
    if (readiness.hasWarnings) {
      redirect(
        scheduleUrl(
          weekStart,
          `&location=${encodeURIComponent(locationId)}&publishCheck=${encodeURIComponent(locationId)}`,
        ),
      );
    }
  }

  let published:boolean;
  try{({published}=await publishScheduleWithRevision({locationId,weekStart,managerId:session.id,proof}));}
  catch(error){if(denied(error))redirect('/app/schedule?error=ACCESS_DENIED');throw error;}
  if(!await currentAdmission(proof,admission))redirect('/app/schedule?error=ACCESS_DENIED');

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

/**
 * Publish changes: publishes every held edit in the week (all locations, one
 * revision, one notification set). Keeps the publish warning review: unless the
 * Owner confirmed, any published location with readiness warnings returns to
 * the schedule with publishChangesCheck set. Form fields: weekStart, and
 * confirmWarnings=yes after review. Redirects with changesPublished=1, or
 * error=NO_PENDING_CHANGES when nothing was waiting.
 */
export async function publishScheduleChangesAction(formData: FormData) {
  const session = await requireRoles(MANAGER_ROLES);
  const proof = await requireSessionMutationProof();
  const weekStart = String(formData.get("weekStart") ?? "");
  const confirmWarnings = formData.get("confirmWarnings") === "yes";
  let admission:Awaited<ReturnType<typeof assertOperationalAccess>>;
  try{admission=await assertOperationalAccess(proof,{kind:'COMPANY'});}catch(error){if(denied(error))redirect('/app/schedule?error=ACCESS_DENIED');throw error;}
  if (!isValidWeekStart(weekStart)) redirect("/app/schedule?error=INVALID_PUBLISH");

  if (!confirmWarnings) {
    const published = (await listScheduleStatuses(weekStart)).filter(s => s.status === "PUBLISHED");
    const readiness = await Promise.all(published.map(s => getSchedulePublishReadiness(weekStart, s.locationId)));
    if(!await currentAdmission(proof,admission))redirect('/app/schedule?error=ACCESS_DENIED');
    // Release 1: the warnings are reviewed on Build and publish, where "Publish changes anyway" confirms.
    if (readiness.some(r => r.hasWarnings)) redirect(`/app/schedule/publish?week=${encodeURIComponent(weekStart)}&review=changes#publish-review`);
  }

  let published:boolean;
  try{({published}=await publishScheduleChanges({weekStart,managerId:session.id,proof}));}
  catch(error){if(denied(error))redirect('/app/schedule?error=ACCESS_DENIED');throw error;}
  if(!await currentAdmission(proof,admission))redirect('/app/schedule?error=ACCESS_DENIED');

  revalidatePath("/app/schedule");
  redirect(scheduleUrl(weekStart, published ? "&changesPublished=1" : "&error=NO_PENDING_CHANGES"));
}

/**
 * Edits a shift using the current operational editor projection. Company-scoped
 * edits also run detailed validation; limited scopes use only admitted options.
 * An absent position field preserves the old position, whereas an empty field
 * explicitly clears it. Persistence owns the final concurrent-source check.
 */
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

  let admission:Awaited<ReturnType<typeof assertOperationalAccess>>;
  try{admission=await assertOperationalAccess(proof,undefined);}
  catch(error){if(denied(error))return accessError();throw error;}
  const company=admission.scope.mode==='COMPANY';
  const editor=await readOperationalShiftEditor(proof,{shiftId});
  if(company&&!await currentAdmission(proof,admission))return accessError();
  if(editor.state!=='ready'||editor.data.saveAvailability!=='available')return accessError();
  const existing=company?await getShiftForManagement(shiftId):editor.data.shift;
  if(company&&!await currentAdmission(proof,admission))return accessError();
  if(!existing||!employeeId||!date||!startTime||!endTime||!isDateInWeek(date,existing.weekStart))redirect('/app/schedule?error=INVALID_SHIFT');
  if(!company&&(!editor.data.employeeOptions.some(e=>e.id===employeeId)||(positionId&&!editor.data.positionOptions.some(p=>p.id===positionId))))return accessError();
  const workspace=await getWorkspace();
  try{shiftBoundaryInstants({date,startTime,endTime},workspace.timeZone);}
  catch{redirect(`/app/schedule/edit?shiftId=${encodeURIComponent(shiftId)}&error=INVALID_SHIFT`);}
  let validation:ReturnType<typeof validateShift>|undefined;
  if(company){
    const context=await getShiftValidationContext({employeeId,locationId:existing.locationId,positionId:positionId===undefined?existing.positionId:positionId||undefined,date,weekStart:existing.weekStart});
    if(!context){if(!await currentAdmission(proof,admission))return accessError();redirect(scheduleUrl(existing.weekStart,'&error=EMPLOYEE_NOT_FOUND'));}
    const adjusted=employeeId===existing.employeeId?prepareExchangeContext(context,existing):context;
    validation=validateShift({candidate:{employeeId,locationId:existing.locationId,positionId:positionId===undefined?existing.positionId:positionId||undefined,date,startTime,endTime,isDesignatedLead},...adjusted,mode:'MANAGER_SCHEDULE'});
    const blocking=validation.issues.find(issue=>issue.severity==='error');
    if(!await currentAdmission(proof,admission))return accessError();
    if(blocking)return {error:blocking.message,issueCode:blocking.code};
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
    if(denied(error))return accessError();
    if(error instanceof ManualAssignmentConflictError){if(company&&!await currentAdmission(proof,admission))return accessError();return company?{error:error.message,issueCode:error.code}:{error:'Assignment is unavailable. Reload and try again.',issueCode:'SOURCE_CHANGED'};}
    throw error;
  }

  if(company&&!await currentAdmission(proof,admission))return accessError();
  if (!updated) {
    redirect(scheduleUrl(existing.weekStart, "&error=INVALID_SHIFT"));
  }

  revalidatePath("/app/schedule");
  const warning = validation?.issues.find((issue) => issue.severity === "warning");

  redirect(
    shiftReturnUrl(
      { weekStart: existing.weekStart, locationId: existing.locationId, date, employeeId },
      `&updated=1${warning ? `&warning=${encodeURIComponent(warning.code)}` : ""}`,
    ),
  );
}

/** Uses the scoped editor before deletion; retained exchange history can refuse the write. */
export async function deleteShiftAction(formData: FormData) {
  await requireRoles(MANAGER_ROLES);
  const proof = await requireSessionMutationProof();
  const shiftId = String(formData.get("shiftId") ?? "");
  let admission:Awaited<ReturnType<typeof assertOperationalAccess>>;
  try{admission=await assertOperationalAccess(proof,undefined);}catch(error){if(denied(error))redirect('/app/schedule?error=ACCESS_DENIED');throw error;}
  const editor=await readOperationalShiftEditor(proof,{shiftId});
  if(!await currentAdmission(proof,admission))redirect('/app/schedule?error=ACCESS_DENIED');
  if(editor.state!=='ready'||editor.data.saveAvailability!=='available'||!editor.data.shift)redirect('/app/schedule?error=ACCESS_DENIED');
  const existing=editor.data.shift;
  let deleted:boolean;
  try{deleted=await deleteShift(shiftId,proof);}
  catch(error){if(denied(error))redirect('/app/schedule?error=ACCESS_DENIED');throw error;}

  if(!await currentAdmission(proof,admission))redirect('/app/schedule?error=ACCESS_DENIED');
  if (!deleted) {
    redirect(
      scheduleUrl(existing.weekStart, "&error=SHIFT_HAS_EXCHANGE_HISTORY"),
    );
  }

  revalidatePath("/app/schedule");
  redirect(shiftReturnUrl(existing, "&deleted=1"));
}

/** Copies through the receipt-based service; retries must reuse the submitted operationId. */
export async function copyPreviousWeekAction(formData: FormData) {
 await requireRoles(MANAGER_ROLES);
 const proof=await requireSessionMutationProof();
 try{await assertOperationalAccess(proof,{kind:'COMPANY'});}catch(error){if(denied(error))redirect('/app/schedule?error=ACCESS_DENIED');throw error;}
 const receipt=await executeScheduleCopy(proof,{operationId:String(formData.get('operationId')??''),kind:'PREVIOUS_WEEK',weekStart:String(formData.get('weekStart')??'')});
 revalidatePath('/app/schedule');
 redirect(`/app/schedule/copy-receipt?operation=${receipt.operationId}`);
}

/**
 * Converts a datetime-local value using the workspace timezone before saving.
 * Pass the conversion workspace to the writer so a concurrent timezone change
 * rejects the save instead of silently moving the intended deadline instant.
 * An empty deadline removes the cutoff; return destinations are allowlisted.
 */
export async function setAvailabilityDeadlineAction(formData: FormData) {
  const session = await requireRoles(MANAGER_ROLES);
  const proof = await requireSessionMutationProof();
  const weekStart = String(formData.get("weekStart") ?? "");
  const returnPath = formData.get("returnTo") === "/app/schedule/settings" ? "/app/schedule/settings" : "/app/schedule";
  const returnUrl = (suffix: string) => `${returnPath}?week=${encodeURIComponent(weekStart)}${suffix}`;
  const deadlineLocal = String(formData.get("availabilityDeadline") ?? "").trim();
  try{await assertOperationalAccess(proof,{kind:'COMPANY'});}catch(error){if(denied(error))redirect('/app/schedule?error=ACCESS_DENIED');throw error;}

  if (
    !isValidWeekStart(weekStart)
  ) {
    redirect(`${returnPath}?error=INVALID_SHIFT`);
  }

  let deadlineIso: string | undefined;
  const conversionWorkspace = deadlineLocal ? await getWorkspace() : undefined;

  if (deadlineLocal && conversionWorkspace) {
    try { deadlineIso = localDateTimeToInstant(deadlineLocal, conversionWorkspace.timeZone); }
    catch { redirect(returnUrl(`&error=INVALID_DEADLINE&availabilityDeadline=${encodeURIComponent(deadlineLocal)}`)); }
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
      redirect(returnUrl(`&error=DEADLINE_WORKSPACE_CHANGED&availabilityDeadline=${encodeURIComponent(deadlineLocal)}`));
    }
    throw error;
  }

  revalidatePath("/app/schedule");
  revalidatePath("/app/availability");
  revalidatePath("/app/schedule/settings");
  redirect(returnUrl("&deadlineSaved=1"));
}
