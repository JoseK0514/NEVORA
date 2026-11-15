import 'server-only';
import {createHash} from 'node:crypto';
import {applicationSql} from '../data/app-sql';
import {queryRows} from '../db';
type Connection={installationId:string;secret:string;businessId?:string};
type Query=(text:string,values:unknown[])=>Promise<unknown>;
/** Called only after private bearer admission. Owner readiness is a fact from
 * durable activation plus current credentials, never commerce enrollment alone. */
export async function readInstallationFactSnapshot(connection:Connection,query:Query=(text,values)=>applicationSql().query(text,values)){
 const hash=createHash('sha256').update(connection.secret).digest('hex');
 const rows=queryRows<{business_id:string;installation_id:string;employee_count:number;time_zone:string;owner_ready:boolean}>(await query(`SELECT i.business_id,i.installation_id,w.time_zone,
 EXISTS(SELECT 1 FROM employees owner JOIN locations home ON home.id=owner.primary_location_id AND home.workspace_id=i.workspace_id JOIN employee_credentials credential ON credential.employee_id=owner.id
 WHERE owner.active AND owner.role='OWNER' AND NOT credential.must_change_password AND NOT EXISTS(SELECT 1 FROM account_deletion_requests d WHERE d.employee_id=owner.id AND d.status IN('received','processing'))
 AND (NOT EXISTS(SELECT 1 FROM public.onboarding_workspace_identity a WHERE a.singleton) OR EXISTS(SELECT 1 FROM public.onboarding_workspace_identity a WHERE a.singleton AND a.workspace_id::text=i.workspace_id AND a.lifecycle='ACTIVE'))) AS owner_ready,
 (SELECT count(*)::int FROM employees WHERE active AND role<>'OWNER') employee_count
 FROM public.nevora_commerce_installation i JOIN workspaces w ON w.singleton AND w.active WHERE i.singleton AND i.installation_id=$1 AND i.instance_secret_hash=$2`,[connection.installationId,hash]));
 const r=rows[0];if(rows.length!==1||!r||connection.businessId!==undefined&&r.business_id!==connection.businessId||typeof r.owner_ready!=='boolean'||!Number.isSafeInteger(r.employee_count)||r.employee_count<0)throw Error('installation_not_ready');
 return {ready:true as const,ownerReady:r.owner_ready,businessId:r.business_id,installationId:r.installation_id,employeeCount:r.employee_count,timeZone:r.time_zone};
}
