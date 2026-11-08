import type {PoolClient} from 'pg';
import type {Business} from './store';
export type BillingOwner={businessId:string;installationId:string;incarnation:string;employeeId:string;sessionTokenHash:string;generation:string};
export type OwnerAuthorityCheck=(business:Business,owner:BillingOwner,client?:PoolClient)=>Promise<boolean>;
export function parseBillingOwner(value:unknown):BillingOwner|null{
 if(!value||typeof value!=='object'||Array.isArray(value))return null;const r=value as Record<string,unknown>;
 const keys=['businessId','installationId','incarnation','employeeId','sessionTokenHash','generation'];
 if(Object.keys(r).length!==keys.length||keys.some(k=>typeof r[k]!=='string')||!/^[-a-f0-9]{36}$/i.test(String(r.businessId))||r.installationId!==r.businessId||!/^[1-9]\d{0,17}$/.test(String(r.incarnation))||!/^[1-9]\d{0,17}$/.test(String(r.generation))||!/^[a-f0-9]{64}$/.test(String(r.sessionTokenHash))||!r.employeeId||String(r.employeeId).length>100||/[\x00-\x1f\x7f]/.test(String(r.employeeId)))return null;
 return r as BillingOwner;
}
