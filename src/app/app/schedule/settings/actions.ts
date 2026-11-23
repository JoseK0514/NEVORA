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
import { readPortalLanguage } from "@/lib/activation/language.server";
import { SCHEDULE_WORDS, scheduleWords, type ScheduleLang } from "../schedule-copy";
import {
  createCoverageWindow,
  replaceCoverageWindowPositionRequirements,
  deleteCoverageWindow,
  listEmployeeHourTargets,
  listLocationStaffingSettings,
  saveScheduleHealthSettings,
} from "@/lib/data/schedule-health";

type Proof=Awaited<ReturnType<typeof requireSessionMutationProof>>;
/** The person's language for a returned message (English when it can't be read). The inline wrappers below only see
 * the form, so they read the session proof again for it; the policy action uses its own proof. */
async function langOf(proof?:Proof):Promise<ScheduleLang>{try{return (await readPortalLanguage(proof??await requireSessionMutationProof())).language;}catch{return 'en';}}
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
  if (inline) return { success: scheduleWords(await langOf(proof)).rulesActions.settingsUpdated };
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
  if(inline)return {success:scheduleWords(await langOf(proof)).rulesActions.windowAdded};
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

/** Inline validation throws the English line; the form wrappers return it in the person's language. */
const inputErrors:Record<string,string>=SCHEDULE_WORDS.en.rulesActions.inputErrors;
async function inlineError(error:unknown,fallback:'settingsFailed'|'windowFailed'){
 const t=scheduleWords(await langOf()).rulesActions;
 const code=error instanceof Error?Object.keys(inputErrors).find(key=>inputErrors[key]===error.message):undefined;
 return {error:code?t.inputErrors[code]:t[fallback]};
}
function validationFailure(code:string,inline:boolean):never {if(inline)throw new Error(inputErrors[code]);redirect(`/app/schedule/settings?error=${code}`);}
function readRequirements(data:FormData){return data.getAll('quotaPositionId').map(String).flatMap(positionId=>{const raw=String(data.get(`quota-${positionId}`)??'').trim();return raw?[{positionId,quantity:Number(raw)}]:[];});}
export async function saveScheduleHealthSettingsAction(data:FormData):Promise<void>{await saveSettings(data);}
export async function addCoverageWindowAction(data:FormData):Promise<void>{await addWindow(data);}
export async function saveScheduleHealthSettingsFormAction(data:FormData){try{return (await saveSettings(data,true))!;}catch(error){return inlineError(error,'settingsFailed');}}
export async function addCoverageWindowFormAction(data:FormData){try{return (await addWindow(data,true))!;}catch(error){return inlineError(error,'windowFailed');}}
export async function replaceCoverageWindowPositionRequirementsAction(data:FormData){
 const proof=await requireSessionMutationProof();
 if(!MANAGER_ROLES.includes(proof.employee.role))redirect("/app");
 const actor=proof.employee;
 try {await configurationAdmission(proof,true);await replaceCoverageWindowPositionRequirements({windowId:String(data.get('windowId')??''),requirements:readRequirements(data),actorEmployeeId:actor.id,proof});revalidatePath('/app/schedule/settings');revalidatePath('/app/settings/locations');return {success:scheduleWords(await langOf(proof)).rulesActions.quantitiesUpdated};}
 catch(error){const t=scheduleWords(await langOf(proof));if(isOperationalAuthorizationError(error)||isManagementAuthorizationError(error))return {error:t.actions.accessDenied};return {error:t.rulesActions.quantitiesInvalid};}
}

export async function saveShiftChangePolicyAction(data:FormData):Promise<import('@/lib/shift-changes/types').PolicyWriteResult>{
 const input=parseWorkflowPolicyForm(data);if(!input)return {status:'invalid',fieldErrors:[{field:'mode',message:scheduleWords(await langOf()).rulesActions.policyInvalid}]};
 const proof=await requireSessionMutationProof();if(proof.employee.role!=='OWNER')return {status:'invalid',fieldErrors:[{field:'authorization',message:scheduleWords(await langOf(proof)).rulesActions.policyOwnerOnly}]};
 const result=await saveShiftChangePolicy({...input,proof},neonNotificationExecutor());
 if(result.status==='saved'){revalidatePath('/app/schedule/settings');revalidatePath('/app/exchange');revalidatePath('/app');}return result;
}
