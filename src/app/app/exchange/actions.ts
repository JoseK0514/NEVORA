'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireSessionMutationProof } from '@/lib/auth/session';
import { requireSelfService,requireRoles,MANAGER_ROLES } from '@/lib/auth/permissions';
import { parseShiftChangeCommand } from '@/lib/shift-changes/command-parser';
import type { ShiftChangeCommand,ShiftChangeResult } from '@/lib/shift-changes/types';
import { executeShiftChange,findShiftChangeOperation } from '@/lib/data/shift-changes';
import { moduleEnabled } from '@/lib/workspace-presentation/current.server';
function refreshShiftChangeResult(result:ShiftChangeResult){if(['completed','pending','closed'].includes(result.status)){revalidatePath('/app/exchange');revalidatePath('/app/schedule');revalidatePath('/app');}}
/**
 * Shared form boundary: select the required role, enforce the module switch,
 * parse an allowed command kind and pass fresh session proof to the service.
 * The service owns transactional eligibility and operation replay; this layer
 * refreshes pages only for known pending/completed/closed results.
 */
async function perform(form:FormData,kinds:ShiftChangeCommand['kind'][],manager=false):Promise<ShiftChangeResult> {
 if(manager)await requireRoles(MANAGER_ROLES);else await requireSelfService('/app/exchange?tab=requests');
 if(!(await moduleEnabled('marketplace')))return {status:'unavailable'}; // turned off by the company (B2)
 const command=parseShiftChangeCommand(form);
 if(!command||!kinds.includes(command.kind))return {status:'unavailable'};
 const proof=await requireSessionMutationProof();
 const result=await executeShiftChange(proof,command);
 refreshShiftChangeResult(result);
 return result;
}
/** Structured result preserves the operation identity for retry/reconciliation UI. */
export async function shiftChangeAction(form:FormData):Promise<ShiftChangeResult> {
 const command=parseShiftChangeCommand(form);if(!command)return {status:'unavailable'};
 return perform(form,[command.kind],command.kind.startsWith('MANAGER_')||['APPROVE_CALLOUT','DECLINE_CALLOUT'].includes(command.kind));
}
/** Reads the original operation after a lost response; never creates a replacement command. */
export async function reconcileShiftChangeAction(operationId:string):Promise<ShiftChangeResult|null> {
 if(!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(operationId))return null;
 const result=await findShiftChangeOperation(await requireSessionMutationProof(),operationId);if(result)refreshShiftChangeResult(result);return result;
}
async function redirectResult(form:FormData,kinds:ShiftChangeCommand['kind'][],success:string,manager=false) {
 const result=await perform(form,kinds,manager);
 if(['pending','completed','closed'].includes(result.status))redirect(`/app/exchange?tab=requests&${success}=1`);
 const code=result.status==='conflict'?'EXCHANGE_CHANGED':result.status==='blocked'?result.issues[0]?.code??'EXCHANGE_UNAVAILABLE':result.status==='outcome-unknown'?'OUTCOME_UNKNOWN':'EXCHANGE_UNAVAILABLE';
 redirect(`/app/exchange?tab=requests&error=${encodeURIComponent(code)}${result.status==='outcome-unknown'?`&operationId=${result.operationId}`:''}`);
}
export async function offerCoverageAction(form:FormData){return redirectResult(form,['OFFER_COVERAGE'],'offered');}
export async function proposeSwapAction(form:FormData){return redirectResult(form,['PROPOSE_SWAP'],'swapRequested');}
export async function claimCoverageAction(form:FormData){return redirectResult(form,['ACCEPT'],'claimed');}
export async function respondSwapAction(form:FormData){return redirectResult(form,['ACCEPT','DECLINE'],'swapResponded');}
export async function reviewExchangeAction(form:FormData){return redirectResult(form,['MANAGER_APPROVE','MANAGER_DECLINE','MANAGER_CLOSE'],'reviewed',true);}
export async function cancelExchangeAction(form:FormData){return redirectResult(form,['CANCEL','WITHDRAW'],'cancelled');}
