"use server";
import {assertOperationalAccess,isOperationalAuthorizationError} from '@/lib/company-access/operational-scope.server';

import {requireSessionMutationProof} from '@/lib/auth/session';
import {parseWorkflowPolicyForm} from '@/lib/shift-changes/policy-form';
import {saveShiftChangePolicy} from '@/lib/data/shift-change-policy';
import {neonNotificationExecutor} from '@/lib/data/notification-transactions';
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isManagementAuthorizationError } from "@/lib/data/management-session";
import { timeMinutes } from "@/lib/scheduling/periods";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import {
  createCoverageWindow,
  replaceCoverageWindowPositionRequirements,
  deleteCoverageWindow,
  listEmployeeHourTargets,
  listLocationStaffingSettings,
  saveScheduleHealthSettings,
} from "@/lib/data/schedule-health";

async function configurationAdmission(proof:Awaited<ReturnType<typeof requireSessionMutationProof>>,inline:boolean){
 try{await assertOperationalAccess(proof,{kind:'COMPANY'});}
 catch(error){if(!inline&&(isOperationalAuthorizationError(error)||isManagementAuthorizationError(error)))redirect('/app/schedule/settings?error=ACCESS_DENIED');throw error;}
}
/**
 * Shared inline/redirect adapter for staffing and hour targets. Preserve explicit
 * lead-choice markers: absent fields must not silently disable a lead rule.
 * Targets are normalized to quarter hours; persistence owns final authority.
 */
async function saveSettings(formData: FormData, inline = false) {
  const proof = await requireSessionMutationProof();
  if (!MANAGER_ROLES.includes(proof.employee.role)) redirect('/app');
  await configurationAdmission(proof,inline);

  const [locations, employees] = await Promise.all([
    listLocationStaffingSettings(),
    listEmployeeHourTargets(),
  ]);

  const staffingSettings = locations.map((location) => {
    const value = Number(formData.get(`staffing-${location.locationId}`));

    if (!Number.isInteger(value) || value < 1 || value > 100) {
      validationFailure("invalid_staffing", inline);
    }

    // Interpret the submitted form shape, never a concurrently changed DB shape.
    const leadChoices = formData.getAll(`lead-choice-${location.locationId}`);
    const checkboxes = formData.getAll(`lead-${location.locationId}`);
    const configuredMarkers = formData.getAll(
      `lead-configured-${location.locationId}`,
    );
    let requiresDesignatedLead: boolean;
    if (leadChoices.length) {
      if (
        leadChoices.length !== 1 ||
        !["true", "false"].includes(String(leadChoices[0])) ||
        checkboxes.length ||
        configuredMarkers.length
      ) {
        validationFailure("invalid_staffing", inline);
      }
      requiresDesignatedLead = leadChoices[0] === "true";
    } else {
      // The marker identifies the rendered checkbox contract even when unchecked;
      // absent or inconsistent fields must never imply false.
      if (
        checkboxes.length > 1 ||
        (checkboxes.length && checkboxes[0] !== "on") ||
        configuredMarkers.length !== 1 ||
        configuredMarkers[0] !== "true"
      ) {
        validationFailure("invalid_staffing", inline);
      }
      requiresDesignatedLead = checkboxes[0] === "on";
    }
    return {
      locationId: location.locationId,
      minimumStaffPerShift: value,
      requiresDesignatedLead,
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
      validationFailure("invalid_hours", inline);
    return {
      employeeId: employee.employeeId,
      targetWeeklyHours:
        targetWeeklyHours === undefined
          ? undefined
          : Math.round(targetWeeklyHours * 4) / 4,
      maximumWeeklyHours: Math.round(maximumWeeklyHours * 4) / 4,
    };
  });

  await saveScheduleHealthSettings({ staffingSettings, hourTargets, proof });

  revalidatePath("/app/schedule");
  revalidatePath("/app/schedule/settings");
  if (inline) return { success: "Schedule health settings updated." };
  redirect("/app/schedule/settings?saved=1");
}
/** Adds a same-day coverage requirement; midnight end input is normalized to 24:00. */
async function addWindow(formData: FormData, inline=false) {
  const proof = await requireSessionMutationProof();
  if (!MANAGER_ROLES.includes(proof.employee.role)) redirect('/app');
  await configurationAdmission(proof,inline);
  const actor = proof.employee;

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
    validationFailure('invalid_window',inline);
  }

  try {
    await createCoverageWindow({
      locationId,
      dayOfWeek,
      startTime,
      endTime,
      minimumStaff,
      actorEmployeeId:actor.id,
      proof,
      positionRequirements:readRequirements(formData),
    });
  } catch {
    validationFailure('duplicate_window',inline);
  }

  revalidatePath("/app/schedule");
  revalidatePath("/app/schedule/settings");
  if(inline)return {success:"Coverage window added."};
  redirect("/app/schedule/settings?windowSaved=1");
}

export async function deleteCoverageWindowAction(formData: FormData) {
  const proof = await requireSessionMutationProof();
  if (!MANAGER_ROLES.includes(proof.employee.role)) redirect('/app');
  await configurationAdmission(proof,false);
  const windowId = String(formData.get("windowId") ?? "");

  if (!windowId) {
    redirect("/app/schedule/settings?error=invalid_window");
  }

  try {
    await deleteCoverageWindow(windowId, proof);
  } catch (error) {
    if(isOperationalAuthorizationError(error))redirect('/app/schedule/settings?error=ACCESS_DENIED');
    if (!isManagementAuthorizationError(error)) throw error;
    // Re-read current cookie authority after the transaction has rolled back.
    // Missing/expired/inactive sessions go to login; role loss uses /app.
    await requireRoles(MANAGER_ROLES);
    redirect("/login");
  }
  revalidatePath("/app/schedule");
  revalidatePath("/app/schedule/settings");
  redirect("/app/schedule/settings?windowDeleted=1");
}

const inputErrors:Record<string,string>={
 invalid_staffing:'Staffing requirements must be whole numbers between 1 and 100. Choose whether a designated Lead is required for each unconfigured location.',
 invalid_hours:'Targets and maximums must be between 0 and 168 hours.',
 invalid_window:'Enter a valid day, time range, and optional staffing override.',
 duplicate_window:'Coverage window could not be saved. Check duplicate periods, active positions, and whole-number quantities from 1 to 100.',
};
function validationFailure(code:string,inline:boolean):never {if(inline)throw new Error(inputErrors[code]);redirect(`/app/schedule/settings?error=${code}`);}
function readRequirements(data:FormData){return data.getAll('quotaPositionId').map(String).flatMap(positionId=>{const raw=String(data.get(`quota-${positionId}`)??'').trim();return raw?[{positionId,quantity:Number(raw)}]:[];});}
export async function saveScheduleHealthSettingsAction(data:FormData):Promise<void>{await saveSettings(data);}
export async function addCoverageWindowAction(data:FormData):Promise<void>{await addWindow(data);}
export async function saveScheduleHealthSettingsFormAction(data:FormData){try{return (await saveSettings(data,true))!;}catch(error){return {error:error instanceof Error&&Object.values(inputErrors).includes(error.message)?error.message:'Settings could not be saved. Your entries are preserved.'};}}
export async function addCoverageWindowFormAction(data:FormData){try{return (await addWindow(data,true))!;}catch(error){return {error:error instanceof Error&&Object.values(inputErrors).includes(error.message)?error.message:'Coverage window could not be saved. Your entries are preserved.'};}}
export async function replaceCoverageWindowPositionRequirementsAction(data:FormData){
 const proof=await requireSessionMutationProof();
 if(!MANAGER_ROLES.includes(proof.employee.role))redirect("/app");
 const actor=proof.employee;
 try {await configurationAdmission(proof,true);await replaceCoverageWindowPositionRequirements({windowId:String(data.get('windowId')??''),requirements:readRequirements(data),actorEmployeeId:actor.id,proof});revalidatePath('/app/schedule/settings');revalidatePath('/app/settings/locations');return {success:'Position quantities updated.'};}
 catch(error){if(isOperationalAuthorizationError(error)||isManagementAuthorizationError(error))return {error:'Operational access is unavailable. Reload and try again.'};return {error:'Choose active positions and whole-number quantities from 1 to 100. Clear inactive quotas or reactivate their positions.'};}
}

export async function saveShiftChangePolicyAction(data:FormData):Promise<import('@/lib/shift-changes/types').PolicyWriteResult>{
 const input=parseWorkflowPolicyForm(data);if(!input)return {status:'invalid',fieldErrors:[{field:'mode',message:'Review approval mode and whole-number deadlines. Blank is unknown; completion advance must not exceed submission advance.'}]};
 const proof=await requireSessionMutationProof();if(proof.employee.role!=='OWNER')return {status:'invalid',fieldErrors:[{field:'authorization',message:'Only an active Owner can save this policy.'}]};
 const result=await saveShiftChangePolicy({...input,proof},neonNotificationExecutor());
 if(result.status==='saved'){revalidatePath('/app/schedule/settings');revalidatePath('/app/exchange');revalidatePath('/app');}return result;
}
