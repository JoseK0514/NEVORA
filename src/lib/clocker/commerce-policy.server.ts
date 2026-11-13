import 'server-only';
import {commerceEnabled,readCommerceAuthority,trialContinuationEnd} from '../commerce/access';
import {ClockerPunchError} from './punch-command';
import type {SqlStatement} from '../notifications/types';

export type ClockerCommercePolicy={mode:'operational';validUntil:number|null}|{mode:'finish_shift';validUntil:number;trialEndedAt:number};
export async function readClockerCommercePolicy():Promise<ClockerCommercePolicy>{
 if(!commerceEnabled())return {mode:'operational',validUntil:null};
 const authority=await readCommerceAuthority();
 if(authority.operational){
  let validUntil=authority.validUntil;
  if(authority.state==='trial'){
   const end=typeof authority.trialEndsAt==='string'?Date.parse(authority.trialEndsAt):NaN;
   if(!Number.isFinite(end)||new Date(end).toISOString()!==authority.trialEndsAt)throw new ClockerPunchError('UNAVAILABLE');
   validUntil=Math.min(validUntil,end);
  }
  if(validUntil<=Date.now())throw new ClockerPunchError('UNAVAILABLE');
  return {mode:'operational',validUntil};
 }
 const trialEndedAt=trialContinuationEnd(authority);
 if(trialEndedAt===null)throw new ClockerPunchError('SUBSCRIPTION_REQUIRED');
 return {mode:'finish_shift',validUntil:authority.validUntil,trialEndedAt};
}
export function commerceDeadlineGuard(policy:ClockerCommercePolicy):SqlStatement[]{
 return policy.validUntil===null?[]:[{text:"SELECT (CASE WHEN clock_timestamp()<to_timestamp($1::double precision/1000) THEN '1' ELSE 'clocker_punch_UNAVAILABLE' END)::integer",values:[policy.validUntil]}];
}
export function assertCommercePolicyCurrent(policy:ClockerCommercePolicy){
 if(policy.validUntil!==null&&policy.validUntil<=Date.now())throw new ClockerPunchError('UNAVAILABLE');
}
