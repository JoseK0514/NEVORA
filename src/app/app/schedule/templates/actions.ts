"use server";
import {assertOperationalAccess,isOperationalAuthorizationError} from '@/lib/company-access/operational-scope.server';
import { requireSessionMutationProof } from "@/lib/auth/session";

import { executeScheduleCopy } from "@/lib/data/schedule-copy";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { isValidWeekStart } from "@/lib/date-utils";
import {
  archiveScheduleTemplate,
  createTemplateFromWeek,
} from "@/lib/data/schedule-templates";
function templateUrl(weekStart: string, suffix = "") {
  return `/app/schedule/templates?week=${encodeURIComponent(weekStart)}${suffix}`;
}

/** Saves a named week template under current company authority; does not apply or publish it. */
export async function saveTemplateAction(formData: FormData) {
  const session = await requireRoles(MANAGER_ROLES);
  const proof = await requireSessionMutationProof();
  const weekStart = String(formData.get("weekStart") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (
    !isValidWeekStart(weekStart) ||
    name.length < 3 ||
    name.length > 50
  ) {
    redirect(templateUrl(weekStart, "&error=invalid"));
  }

  try {
    await assertOperationalAccess(proof,{kind:'COMPANY'});
    await createTemplateFromWeek({
      name,
      weekStart,
      createdBy: session.id,
      proof,
    });
  } catch {
    redirect(templateUrl(weekStart, "&error=save"));
  }

  revalidatePath("/app/schedule/templates");
  redirect(templateUrl(weekStart, "&saved=1"));
}

/** Applies a template via the shared copy transaction and redirects to its operation receipt. */
export async function applyTemplateAction(formData: FormData) {
 await requireRoles(MANAGER_ROLES);
 const proof=await requireSessionMutationProof();
 try{await assertOperationalAccess(proof,{kind:'COMPANY'});}catch(error){if(isOperationalAuthorizationError(error))redirect('/app/schedule?error=ACCESS_DENIED');throw error;}
 const receipt=await executeScheduleCopy(proof,{operationId:String(formData.get('operationId')??''),kind:'TEMPLATE',weekStart:String(formData.get('weekStart')??''),templateId:String(formData.get('templateId')??'')});
 revalidatePath('/app/schedule');
 redirect(`/app/schedule/copy-receipt?operation=${receipt.operationId}`);
}

/** Archives a template under current company authority while preserving its history. */
export async function archiveTemplateAction(formData: FormData) {
  await requireRoles(MANAGER_ROLES);
  const proof = await requireSessionMutationProof();
  const weekStart = String(formData.get("weekStart") ?? "");
  const templateId = String(formData.get("templateId") ?? "");

  if (!templateId) {
    redirect(templateUrl(weekStart, "&error=invalid"));
  }

  try{await assertOperationalAccess(proof,{kind:'COMPANY'});await archiveScheduleTemplate(templateId,proof);}
  catch(error){if(isOperationalAuthorizationError(error))redirect(templateUrl(weekStart,'&error=ACCESS_DENIED'));throw error;}
  revalidatePath("/app/schedule/templates");
  redirect(templateUrl(weekStart, "&archived=1"));
}
