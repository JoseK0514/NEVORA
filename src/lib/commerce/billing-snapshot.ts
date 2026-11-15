import {billingNotice,type BillingNotice} from './billing-notice';
const object=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
import {parseCommerceStatus,type CommerceStatus} from './status';
/** Private company-Owner presentation only. Velani's public billing contract
 * continues to use CommerceStatus without this browser disclosure lifetime. */
export const BILLING_SNAPSHOT_LIFETIME_MS=15000;
export type BillingSnapshot={state:'ready';observedAt:string;validForMs:number;status:CommerceStatus;notice?:BillingNotice|null}|{state:'unavailable';reason:'read_failed'|'access_denied'};
export function parseBillingSnapshot(value:unknown):BillingSnapshot{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid billing snapshot');
 const v=value as Record<string,unknown>;
 if(typeof v.observedAt!=='string'||v.observedAt.length!==24||!Number.isFinite(Date.parse(v.observedAt))||new Date(v.observedAt).toISOString()!==v.observedAt||typeof v.validForMs!=='number'||!Number.isSafeInteger(v.validForMs)||v.validForMs<=0||v.validForMs>BILLING_SNAPSHOT_LIFETIME_MS)throw Error('Invalid billing snapshot');
 const status=parseCommerceStatus(v),notice=billingNotice(status,Date.parse(v.observedAt));
 if(v.notice!==undefined){if(v.notice===null?notice!==null:!notice||!object(v.notice)||Object.keys(v.notice).sort().join(',')!=='daysRemaining,dueAt,href,id,kind'||Object.entries(notice).some(([key,value])=>(v.notice as Record<string,unknown>)[key]!==value))throw Error('invalid_billing_snapshot');}
 return {state:'ready',observedAt:v.observedAt,validForMs:v.validForMs,status,...(v.notice===undefined?{}:{notice})};
}
