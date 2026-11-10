import 'server-only';
import {companyWorkerPrivilegePredicate} from '../company-bootstrap/worker-privilege-guard';
import {createHash} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
import {parseWorkerEnrollmentIdentity,parseWorkerEnrollmentMaterial,type WorkerEnrollmentIdentity,type WorkerEnrollmentMaterial} from './worker-enrollment';
/** Fixed, read-only proof through the original company WORKER login. A swapped
 * issuer root must fail before its derived secret is sealed for a recipient. */
export async function verifyWorkerEnrollmentCompany(identity:WorkerEnrollmentIdentity,material:WorkerEnrollmentMaterial):Promise<boolean>{
 try{
  const r=parseWorkerEnrollmentIdentity(identity),m=parseWorkerEnrollmentMaterial(material,r),sql=neon(m.databaseUrl);
  const rows=await sql.query(`SELECT EXISTS(
   SELECT 1 FROM onboarding_workspace_identity a JOIN workspaces w ON w.id=a.workspace_id AND w.singleton AND w.active
   JOIN onboarding_runtime_roles b ON b.kind='WORKER' AND b.login_role::text=$5
   JOIN pg_catalog.pg_roles p ON p.rolname=b.login_role
   JOIN nevora_commerce_installation c ON c.singleton AND c.workspace_id=a.workspace_id
   WHERE a.singleton AND a.workspace_id::text=$1 AND a.environment=$2 AND a.incarnation=$3::bigint AND a.provider_project_id=$4 AND a.lifecycle='ACTIVE'
   AND p.rolname=current_user AND current_user=session_user AND p.rolcanlogin AND NOT(p.rolsuper OR p.rolbypassrls OR p.rolcreatedb OR p.rolcreaterole OR p.rolreplication OR p.rolinherit)
   AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_auth_members m WHERE m.member=p.oid)
   AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_namespace n WHERE n.nspowner=p.oid)
   AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class t WHERE t.relowner=p.oid)
   AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_proc fn WHERE fn.proowner=p.oid)
   AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_database d WHERE d.datdba=p.oid)
   AND ${companyWorkerPrivilegePredicate}
   AND c.worker_secret_hash<>c.instance_secret_hash AND c.business_id::text=$1 AND c.installation_id::text=$1 AND c.environment=$2 AND c.incarnation=$3::bigint AND c.canonical_origin=$6 AND c.worker_secret_hash=$7
  ) AS verified`,[r.workspaceId,r.environment,r.incarnation,r.providerProjectId,r.loginRole,r.canonicalOrigin,createHash('sha256').update(m.commerceWorkerSecret).digest('hex')],{fetchOptions:{signal:AbortSignal.timeout(5000)}});
  return rows.length===1&&rows[0].verified===true;
 }catch{return false;}
}
