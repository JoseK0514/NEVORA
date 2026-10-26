"use server";
import { moduleEnabled, moduleState } from "@/lib/workspace-presentation/current.server";

import {isOperationalAuthorizationError} from '@/lib/company-access/operational-scope.server';

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

/**
 * Validates an employee-owned time-off request and preserves its client request
 * UUID for persistence. Actor identity always comes from the session. Partial
 * days must fit one calendar date; full-day ranges are inclusive date labels.
 */
const REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** B12/B20: "not sent, try again", keeping the same request id so the retry is the same idempotent request. */
const unsent = (requestId: string): never => redirect(`/app/requests?error=unavailable${REQUEST_ID.test(requestId) ? `&requestId=${requestId}` : ""}`);

export async function requestTimeOffAction(formData: FormData) {
  const session = await requireSelfService("/app/requests");
  const requestId = String(formData.get("requestId") ?? "");
  const gate = await moduleState("timeOff");
  if (gate === "off") redirect("/app/requests"); // turned off by the company (B2)
  // B12: settings that could not be read must not drop the request silently.
  if (gate === "unknown") unsent(requestId);
  const proof = await requireSessionMutationProof();
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  const partialDay = formData.get("partialDay") === "on";
  const startTime = partialDay ? String(formData.get("startTime") ?? "") : undefined;
  const endTime = partialDay ? String(formData.get("endTime") ?? "") : undefined;
  const reason = String(formData.get("reason") ?? "").trim();

  if (
    !REQUEST_ID.test(requestId) ||
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

  try {
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
  } catch (error) {
    // B20: a refusal still reaches the error screen as before. Anything else (a timeout, a lost connection) may or
    // may not have committed; the request id is idempotent (ON CONFLICT (id) DO NOTHING), so the form comes back
    // with the same id and sending again cannot create a second request.
    if (isOperationalAuthorizationError(error) || isManagementAuthorizationError(error)) throw error;
    unsent(requestId);
  }

  revalidatePath("/app/requests");
  redirect("/app/requests?tab=my&submitted=1");
}

/**
 * Routes an authorized approve/deny decision to the guarded writer, then returns
 * to an allowlisted list/home/inbox context. A false write result means no review
 * was recorded; do not show the success redirect for that outcome.
 */
export async function reviewTimeOffAction(formData: FormData) {
  const session = await requireRoles(TIME_OFF_REVIEW_ROLES);
  const gate = await moduleState("timeOff");
  if (gate === "off") redirect("/app/requests");
  // B12: an unreadable setting reports "review not recorded" instead of silently dropping the decision.
  if (gate === "unknown") redirect("/app/requests?tab=pending&error=review");
  const proof = await requireSessionMutationProof();
  const requestId = String(formData.get("requestId") ?? "");
  const decision = String(formData.get("decision") ?? "");

  if (!requestId || (decision !== "APPROVED" && decision !== "DENIED")) {
    redirect("/app/requests?tab=pending&error=review");
  }

  let reviewed:boolean;
  try {
    reviewed=await reviewTimeOffRequest({requestId,managerId:session.id,proof,status:decision});
  } catch(error) {
    if(isOperationalAuthorizationError(error)||isManagementAuthorizationError(error))redirect('/app/requests?tab=team&error=review');
    throw error;
  }

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

/**
 * Withdraws with explicit confirmation and a deterministic command identity.
 * Unknown transport outcomes remain unavailable so the same command can be
 * retried; only a returned receipt proves the withdrawal was recorded.
 */
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
