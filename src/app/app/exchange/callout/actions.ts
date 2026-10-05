'use server';
import { redirect } from 'next/navigation';
import { shiftChangeAction } from '../actions';
import { parseShiftChangeCommand } from '@/lib/shift-changes/command-parser';
import type { ShiftChangeCommand } from '@/lib/shift-changes/types';
import { requireSelfService,requireRoles,MANAGER_ROLES } from '@/lib/auth/permissions';
async function perform(form:FormData,kinds:ShiftChangeCommand['kind'][],success:string,manager=false) {
 if(manager)await requireRoles(MANAGER_ROLES);else await requireSelfService('/app/exchange?tab=requests');
 const c=parseShiftChangeCommand(form);
 if(!c||!kinds.includes(c.kind))redirect('/app/exchange?tab=requests&error=EXCHANGE_UNAVAILABLE');
 const result=await shiftChangeAction(form);
 if(['completed','pending','closed'].includes(result.status))redirect(`/app/exchange?tab=requests&${success}=1`);
 redirect(`/app/exchange?tab=requests&error=${result.status==='conflict'?'EXCHANGE_CHANGED':result.status==='outcome-unknown'?'OUTCOME_UNKNOWN':'EXCHANGE_UNAVAILABLE'}${result.status==='outcome-unknown'?`&operationId=${result.operationId}`:''}`);
}
export async function submitCalloutAction(form:FormData){return perform(form,['SUBMIT_CALLOUT'],'calloutSubmitted');}
export async function reviewCalloutAction(form:FormData){return perform(form,['APPROVE_CALLOUT','DECLINE_CALLOUT'],'calloutReviewed',true);}
export async function cancelCalloutAction(form:FormData){return perform(form,['CANCEL_CALLOUT'],'calloutCancelled');}
