import type {CommerceStatus} from './status';
export type BillingNotice={id:string;kind:'TRIAL_ENDING'|'PAYMENT_FAILED'|'ACCESS_RESTRICTED';dueAt:string|null;daysRemaining:number|null;href:'/app/billing'};
/** Current Owner guidance, not a receipt that payment or email delivery occurred. */
export function billingNotice(status:CommerceStatus,now:number):BillingNotice|null{
 if(!Number.isFinite(now))throw Error('invalid_billing_notice');
 if(status.state==='trial'&&status.trialEndsAt){const left=Date.parse(status.trialEndsAt)-now;if(left>0&&left<=7*86400000){const daysRemaining=Math.ceil(left/86400000);return {id:`trial:${status.trialEndsAt}:${daysRemaining<=1?'1':'7'}`,kind:'TRIAL_ENDING',dueAt:status.trialEndsAt,daysRemaining,href:'/app/billing'};}}
 if(status.reason==='payment_failed')return {id:`payment:${status.graceEndsAt??'review'}`,kind:'PAYMENT_FAILED',dueAt:status.graceEndsAt,daysRemaining:status.graceEndsAt?Math.max(0,Math.ceil((Date.parse(status.graceEndsAt)-now)/86400000)):null,href:'/app/billing'};
 if(status.state==='restricted')return {id:`restricted:${status.reason}`,kind:'ACCESS_RESTRICTED',dueAt:null,daysRemaining:null,href:'/app/billing'};
 return null;
}
