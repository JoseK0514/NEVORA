import {parseCommerceStatus,type CommerceStatus} from './status';
/** Private company-Owner presentation only. Velani's public billing contract
 * continues to use CommerceStatus without this browser disclosure lifetime. */
export const BILLING_SNAPSHOT_LIFETIME_MS=15000;
export type BillingSnapshot={state:'ready';observedAt:string;validForMs:number;status:CommerceStatus}|{state:'unavailable';reason:'read_failed'|'access_denied'};
export function parseBillingSnapshot(value:unknown):BillingSnapshot{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid billing snapshot');
 const v=value as Record<string,unknown>;
 if(typeof v.observedAt!=='string'||v.observedAt.length!==24||!Number.isFinite(Date.parse(v.observedAt))||new Date(v.observedAt).toISOString()!==v.observedAt||typeof v.validForMs!=='number'||!Number.isSafeInteger(v.validForMs)||v.validForMs<=0||v.validForMs>BILLING_SNAPSHOT_LIFETIME_MS)throw Error('Invalid billing snapshot');
 return {state:'ready',observedAt:v.observedAt,validForMs:v.validForMs,status:parseCommerceStatus(v)};
}
