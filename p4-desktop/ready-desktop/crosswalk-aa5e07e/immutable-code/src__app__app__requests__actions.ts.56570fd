"use server";
import { moduleEnabled } from "@/lib/workspace-presentation/current.server";

import { isValidIsoDate } from "@/lib/date-utils";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { TIME_OFF_REVIEW_ROLES, requireRoles, requireSelfService } from "@/lib/auth/permissions";
import {
  createTimeOffRequest,
  reviewTimeOffRequest,
  withdrawTimeOffRequest,
} from "@/lib/data/requests";

export async function requestTimeOffAction(formData: FormData) {
  const session = await requireSelfService("/app/requests");
  if (!(await moduleEnabled("timeOff"))) redirect("/app/requests"); // turned off by the company (B2)
  const proof = await requireSessionMutationProof();
  const requestId = String(formData.get("requestId") ?? "");
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  const partialDay = formData.get("partialDay") === "on";
  const startTime = partialDay ? String(formData.get("startTime") ?? "") : undefined;
  const endTime = partialDay ? String(formData.get("endTime") ?? "") : undefined;
  const reason = String(formData.get("reason") ?? "").trim();

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId) ||
    !isValidIsoDate(startDate) ||
    !isValidIsoDate(endDate) ||
    startDate > endDate ||
    (partialDay && startDate !== endDate) ||
    (partialDay &&
      (!startTime ||
        !endTime ||
        !/^\d{2}:\d{2}$/.test(startTime) ||
        !/^\d{2}:\d{2}$/.test(endTime) ||
        startTime >= endTime))
  ) {
    redirect("/app/requests?error=invalid");
  }

  await createTimeOffRequest({
    requestId,
    employeeId: session.id,
    proof,
    startDate,
    endDate,
    startTime,
    endTime,
    reason: reason || undefined,
  });

  revalidatePath("/app/requests");
  redirect("/app/requests?tab=my&submitted=1");
}

export async function reviewTimeOffAction(formData: FormData) {
  const session = await requireRoles(TIME_OFF_REVIEW_ROLES);
  if (!(await moduleEnabled("timeOff"))) redirect("/app/requests");
  const proof = await requireSessionMutationProof();
  const requestId = String(formData.get("requestId") ?? "");
  const decision = String(formData.get("decision") ?? "");

  if (!requestId || (decision !== "APPROVED" && decision !== "DENIED")) {
    redirect("/app/requests?tab=pending&error=review");
  }

  const reviewed = await reviewTimeOffRequest({
    requestId,
    managerId: session.id,
    proof,
    status: decision,
  });

  // D-5: a focused review returns to where the manager came from. Only two fixed
  // destinations are accepted; anything else keeps the list's own redirect.
  const returnTo = String(formData.get("returnTo") ?? "");
  const origin = returnTo === "inbox" || returnTo === "home" ? returnTo : null;
  if (!reviewed) redirect(origin ? `/app/requests?tab=pending&error=review&requestId=${encodeURIComponent(requestId)}&from=${origin}` : "/app/requests?tab=pending&error=review");

  revalidatePath("/app/requests");
  if (origin) {
    revalidatePath("/app/inbox");
    const outcome = decision === "APPROVED" ? "approved" : "declined";
    // The Inbox filter the manager came from, from a fixed list (never a free-form address).
    const filter = String(formData.get("returnFilter") ?? "requests");
    const back = filter === "all" ? "" : ["now", "requests", "planning"].includes(filter) ? `filter=${filter}&` : "filter=requests&";
    redirect(origin === "home" ? `/app?decided=timeoff-${outcome}` : `/app/inbox?${back}decided=timeoff-${outcome}`);
  }
  redirect("/app/requests?tab=pending&reviewed=1");
}


import { parseWithdrawalCommand, type WithdrawalActionState } from '@/lib/time-off-withdrawal';
import { isManagementAuthorizationError } from '@/lib/data/management-session';

export async function withdrawTimeOffAction(_previous:WithdrawalActionState, formData:FormData):Promise<WithdrawalActionState> {
  const session=await requireSelfService('/app/requests');
  if(!(await moduleEnabled('timeOff')))return {outcome:'unavailable'};
  const proof=await requireSessionMutationProof();
  let command;
  try{
    const fields=[...formData.keys()].filter(key=>!key.startsWith('$ACTION_'));
    if(fields.sort().join(',')!=='confirmed,operationId,requestId'||formData.get('confirmed')!=='yes')return {outcome:'invalid'};
    command=parseWithdrawalCommand({requestId:formData.get('requestId'),operationId:formData.get('operationId')});
  }catch{return {outcome:'invalid'};}
  let receipt;
  try{receipt=await withdrawTimeOffRequest({...command,employeeId:session.id,proof});}
  catch(error){return {outcome:isManagementAuthorizationError(error)?'denied':'unavailable'};}
  // Revalidation happens only after a known transaction result. A transport
  // failure remains unknown and retains the exact command for protected retry.
  revalidatePath('/app/requests');
  if(!receipt)return {outcome:'conflict'};
  return {outcome:'withdrawn',receipt};
}
