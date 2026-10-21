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
import {
  deleteShift,
  createCoverageRepairShift,
  getShiftForManagement,
  getShiftValidationContext,
  insertShiftAtLocation,
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
async function currentAdmission(proof:Awaited<ReturnType<typeof requireSessionMutationProof>>,original:Awaited<ReturnType<typeof assertOperationalAccess>>){
 try{await assertOriginalOperationalAccess(proof,original);return true;}
 catch(error){if(denied(error))return false;throw error;}
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

  let admission:Awaited<ReturnType<typeof assertOperationalAccess>>;
  try{admission=await assertOperationalAccess(proof,{kind:'LOCATIONS',locationIds:[locationId]});}
  catch(error){if(denied(error))return accessError();throw error;}
  const company=admission.scope.mode==='COMPANY';

  if (formData.has('coverageRepairReview')) {
    let saved;
    try {
      saved = await createCoverageRepairShift({ review: String(formData.get('coverageRepairReview') ?? ''),
        weekStart, employeeId, locationId, date, startTime, endTime, positionId, isDesignatedLead, actorEmployeeId: session.id, proof });
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

export async function deleteShiftAction(formData: FormData) {
  const session = await requireRoles(MANAGER_ROLES);
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

export async function copyPreviousWeekAction(formData: FormData) {
 await requireRoles(MANAGER_ROLES);
 const proof=await requireSessionMutationProof();
 try{await assertOperationalAccess(proof,{kind:'COMPANY'});}catch(error){if(denied(error))redirect('/app/schedule?error=ACCESS_DENIED');throw error;}
 const receipt=await executeScheduleCopy(proof,{operationId:String(formData.get('operationId')??''),kind:'PREVIOUS_WEEK',weekStart:String(formData.get('weekStart')??'')});
 revalidatePath('/app/schedule');
 redirect(`/app/schedule/copy-receipt?operation=${receipt.operationId}`);
}

export async function setAvailabilityDeadlineAction(formData: FormData) {
  const session = await requireRoles(MANAGER_ROLES);
  const proof = await requireSessionMutationProof();
  const weekStart = String(formData.get("weekStart") ?? "");
  const deadlineLocal = String(formData.get("availabilityDeadline") ?? "").trim();
  try{await assertOperationalAccess(proof,{kind:'COMPANY'});}catch(error){if(denied(error))redirect('/app/schedule?error=ACCESS_DENIED');throw error;}

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
