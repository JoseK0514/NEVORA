"use server";
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

export async function saveTemplateAction(formData: FormData) {
  const session = await requireRoles(MANAGER_ROLES);
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
    await createTemplateFromWeek({
      name,
      weekStart,
      createdBy: session.id,
      proof: await requireSessionMutationProof(),
    });
  } catch {
    redirect(templateUrl(weekStart, "&error=save"));
  }

  revalidatePath("/app/schedule/templates");
  redirect(templateUrl(weekStart, "&saved=1"));
}

export async function applyTemplateAction(formData: FormData) {
 await requireRoles(MANAGER_ROLES);
 const proof=await requireSessionMutationProof();
 const receipt=await executeScheduleCopy(proof,{operationId:String(formData.get('operationId')??''),kind:'TEMPLATE',weekStart:String(formData.get('weekStart')??''),templateId:String(formData.get('templateId')??'')});
 revalidatePath('/app/schedule');
 redirect(`/app/schedule/copy-receipt?operation=${receipt.operationId}`);
}

export async function archiveTemplateAction(formData: FormData) {
  await requireRoles(MANAGER_ROLES);
  const weekStart = String(formData.get("weekStart") ?? "");
  const templateId = String(formData.get("templateId") ?? "");

  if (!templateId) {
    redirect(templateUrl(weekStart, "&error=invalid"));
  }

  await archiveScheduleTemplate(templateId, await requireSessionMutationProof());
  revalidatePath("/app/schedule/templates");
  redirect(templateUrl(weekStart, "&archived=1"));
}
