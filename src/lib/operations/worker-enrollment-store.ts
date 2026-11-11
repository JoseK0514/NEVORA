import 'server-only';
import {createHash} from 'node:crypto';
import {isClosedRecord,isOperationId} from '../onboarding/contracts';
import {openOnboardingValue,validOnboardingToken} from '../onboarding/crypto.server';
import {parseWorkspaceRecord} from '../workspace-routing/contracts';
import {workspaceInstanceSecret} from '../../../services/commerce/workspace-enrollment';
import {parseWorkerEnrollmentIdentity,parseWorkerEnrollmentMaterial,sealWorkerEnrollment,workerRecipientFingerprint,type WorkerEnrollmentIdentity,type WorkerEnrollmentMaterial} from './worker-enrollment';

export type WorkerEnrollmentRequest=WorkerEnrollmentIdentity&Readonly<{registryRevision:string;recipientPublicKey:string;requestExpiresAt:string}>;
export type WorkerEnrollmentRequestBinding=Readonly<{id:string;requestHash:string}>;
export type EnrollmentQuery={query(text:string,values?:unknown[]):Promise<{rows:Record<string,unknown>[]}>};
type EnrollmentClient=EnrollmentQuery&{on(event:'error',listener:()=>void):unknown;removeListener(event:'error',listener:()=>void):unknown;release(destroy?:boolean):void};
export type EnrollmentDatabase={connect():Promise<EnrollmentClient>};
export type WorkerEnrollmentCompanyProbe=(identity:WorkerEnrollmentIdentity,material:WorkerEnrollmentMaterial)=>Promise<unknown>;
const invalid=()=>Error('worker_enrollment_invalid');
const queryColumns='id::text,workspace_id::text,environment,incarnation::text,registry_revision::text,source_secret_ref::text,login_role::text,canonical_origin,provider_project_id,recipient_public_key,recipient_fingerprint,issuer_source_sha,request_hash,request_expires_at,expires_at';
function timestamp(value:unknown):string{if(value instanceof Date)return value.toISOString();if(typeof value!=='string')throw invalid();return new Date(value).toISOString();}
export function parseWorkerEnrollmentRequest(value:unknown):WorkerEnrollmentRequest{
 try{
 if(!isClosedRecord(value,['schemaVersion','enrollmentId','workspaceId','environment','incarnation','registryRevision','sourceSecretRef','loginRole','canonicalOrigin','providerProjectId','recipientPublicKey','recipientFingerprint','issuerSourceSha','requestExpiresAt','expiresAt']))throw invalid();
 const {registryRevision,recipientPublicKey,requestExpiresAt,...identity}=value,bound=parseWorkerEnrollmentIdentity(identity);
 if(typeof registryRevision!=='string'||! /^[1-9]\d{0,17}$/.test(registryRevision)||typeof recipientPublicKey!=='string'||!recipientPublicKey.startsWith('-----BEGIN PUBLIC KEY-----\n')||workerRecipientFingerprint(recipientPublicKey)!==bound.recipientFingerprint||typeof requestExpiresAt!=='string'||timestamp(requestExpiresAt)!==requestExpiresAt||Date.parse(requestExpiresAt)>Date.parse(bound.expiresAt))throw invalid();
 return Object.freeze({...bound,registryRevision,recipientPublicKey,requestExpiresAt});
 }catch{throw invalid();}
}
function fromRow(row:Record<string,unknown>){return parseWorkerEnrollmentRequest({schemaVersion:1,enrollmentId:row.id,workspaceId:row.workspace_id,environment:row.environment,incarnation:row.incarnation,registryRevision:row.registry_revision,sourceSecretRef:row.source_secret_ref,loginRole:row.login_role,canonicalOrigin:row.canonical_origin,providerProjectId:row.provider_project_id,recipientPublicKey:row.recipient_public_key,recipientFingerprint:row.recipient_fingerprint,issuerSourceSha:row.issuer_source_sha,requestExpiresAt:timestamp(row.request_expires_at),expiresAt:timestamp(row.expires_at)});}
export function workerEnrollmentRequestHash(value:unknown){return createHash('sha256').update(JSON.stringify(parseWorkerEnrollmentRequest(value))).digest('hex');}
/** Operator request contains public material only. Exact existing receipts remain
 * recoverable after expiry; changed metadata under an existing UUID conflicts. */
export async function createWorkerEnrollmentRequest(admin:EnrollmentQuery,value:unknown):Promise<WorkerEnrollmentRequestBinding>{
 try{
  const r=parseWorkerEnrollmentRequest(value),hash=workerEnrollmentRequestHash(r);
  const existing=await admin.query('SELECT request_hash FROM nevora_onboarding.worker_runtime_enrollments WHERE id=$1',[r.enrollmentId]);
  if(existing.rows.length){if(existing.rows.length!==1||existing.rows[0].request_hash!==hash)throw invalid();return {id:r.enrollmentId,requestHash:hash};}
  await admin.query(`INSERT INTO nevora_onboarding.worker_runtime_enrollments(id,workspace_id,environment,incarnation,registry_revision,source_secret_ref,login_role,canonical_origin,provider_project_id,recipient_public_key,recipient_fingerprint,issuer_source_sha,request_hash,request_expires_at,expires_at)
   SELECT $1,$2,$3,$4::bigint,$5::bigint,$6,$7,$8,$9,$10,$11,$12,$13,$14::timestamptz,$15::timestamptz
   WHERE $14::timestamptz>clock_timestamp() AND $14::timestamptz<=clock_timestamp()+interval '30 minutes' AND $15::timestamptz<=clock_timestamp()+interval '24 hours'
   ON CONFLICT(id) DO NOTHING`,[r.enrollmentId,r.workspaceId,r.environment,r.incarnation,r.registryRevision,r.sourceSecretRef,r.loginRole,r.canonicalOrigin,r.providerProjectId,r.recipientPublicKey,r.recipientFingerprint,r.issuerSourceSha,hash,r.requestExpiresAt,r.expiresAt]);
  const receipt=await admin.query('SELECT request_hash FROM nevora_onboarding.worker_runtime_enrollments WHERE id=$1',[r.enrollmentId]);
  if(receipt.rows.length!==1||receipt.rows[0].request_hash!==hash)throw invalid();return {id:r.enrollmentId,requestHash:hash};
 }catch{throw invalid();}
}
async function assertIssuerPrivileges(admin:EnrollmentQuery,role:string){
 if(!/^nv_control_provision_[a-f0-9]{24}$/.test(role))throw invalid();
  const rows=(await admin.query(`SELECT p.rolcanlogin,NOT(p.rolsuper OR p.rolcreatedb OR p.rolcreaterole OR p.rolinherit OR p.rolreplication OR p.rolbypassrls) flags,
   NOT EXISTS(SELECT 1 FROM pg_catalog.pg_auth_members m WHERE m.member=p.oid) unshared,
   pg_catalog.has_table_privilege(p.oid,'nevora_onboarding.workspace_registry','SELECT') AND pg_catalog.has_table_privilege(p.oid,'nevora_onboarding.workspace_secrets','SELECT')
   AND pg_catalog.has_any_column_privilege(p.oid,'nevora_onboarding.workspace_registry','UPDATE') AND pg_catalog.has_any_column_privilege(p.oid,'nevora_onboarding.workspace_secrets','UPDATE') original_custody
   FROM pg_catalog.pg_roles p WHERE p.rolname=$1`,[role])).rows;
  if(rows.length!==1||['rolcanlogin','flags','unshared','original_custody'].some(k=>rows[0][k]!==true))throw invalid();
}
/** Audit only the newly introduced capability; original provisioning grants
 * remain unchanged. Missing minimum rights are allowed only before setup. */
async function assertEnrollmentPrivileges(admin:EnrollmentQuery,role:string,requireAccess:boolean){
 const rows=(await admin.query(`SELECT c.relrowsecurity AND c.relforcerowsecurity AND c.relowner<>p.oid AS rls,
  EXISTS(SELECT 1 FROM pg_catalog.pg_trigger t WHERE t.tgrelid=c.oid AND t.tgname='worker_enrollment_immutable' AND t.tgenabled IN('O','A') AND t.tgfoid='nevora_onboarding.worker_enrollment_immutable()'::pg_catalog.regprocedure) AS immutable,
  NOT pg_catalog.has_table_privilege(p.oid,c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'||CASE WHEN pg_catalog.current_setting('server_version_num')::int>=170000 THEN ',MAINTAIN' ELSE '' END)
  AND NOT pg_catalog.has_table_privilege(p.oid,c.oid,'SELECT WITH GRANT OPTION')
  AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped AND (
   pg_catalog.has_column_privilege(p.oid,c.oid,a.attnum,'INSERT,REFERENCES,SELECT WITH GRANT OPTION,INSERT WITH GRANT OPTION,UPDATE WITH GRANT OPTION')
   OR (a.attname NOT IN('status','key_envelope','ciphertext','issued_at') AND pg_catalog.has_column_privilege(p.oid,c.oid,a.attnum,'UPDATE')))) AS bounded,
  pg_catalog.has_table_privilege(p.oid,c.oid,'SELECT') AND NOT EXISTS(SELECT 1 FROM unnest(ARRAY['status','key_envelope','ciphertext','issued_at']) a WHERE NOT pg_catalog.has_column_privilege(p.oid,c.oid,a,'UPDATE')) AS ready
 FROM pg_catalog.pg_roles p JOIN pg_catalog.pg_class c ON c.oid='nevora_onboarding.worker_runtime_enrollments'::pg_catalog.regclass WHERE p.rolname=$1`,[role])).rows;
 if(rows.length!==1||['rls','immutable','bounded'].some(k=>rows[0][k]!==true)||requireAccess&&rows[0].ready!==true)throw invalid();
}
function transactionClient(value:unknown):value is EnrollmentClient{
 return !!value&&typeof value==='object'&&'query'in value&&typeof value.query==='function'&&'release'in value&&typeof value.release==='function'&&'on'in value&&typeof value.on==='function'&&'removeListener'in value&&typeof value.removeListener==='function';
}
/** Adds only the enrollment-table capability to an existing restricted issuer
 * that already reads original provisioning custody. No role/password is made. */
export async function configureWorkerEnrollmentIssuer(admin:unknown,role:string){
 if(!transactionClient(admin)||!/^nv_control_provision_[a-f0-9]{24}$/.test(role))throw invalid();
 await admin.query('BEGIN');try{
  await assertIssuerPrivileges(admin,role);await assertEnrollmentPrivileges(admin,role,false);
  const policy='enrollment_issuer_'+role.slice(-24);
  await admin.query(`DROP POLICY IF EXISTS "${policy}" ON nevora_onboarding.worker_runtime_enrollments`);
  await admin.query(`CREATE POLICY "${policy}" ON nevora_onboarding.worker_runtime_enrollments TO "${role}" USING(true) WITH CHECK(true)`);
  await admin.query(`GRANT USAGE ON SCHEMA nevora_onboarding TO "${role}"; GRANT SELECT,UPDATE(status,key_envelope,ciphertext,issued_at) ON nevora_onboarding.worker_runtime_enrollments TO "${role}"`);
  await assertEnrollmentPrivileges(admin,role,true);await admin.query('COMMIT');
 }catch{await admin.query('ROLLBACK').catch(()=>{});throw invalid();}
}
function bindings(value:unknown):readonly WorkerEnrollmentRequestBinding[]{
 if(!Array.isArray(value)||value.length<1||value.length>2)throw invalid();const seen=new Set<string>();
 return value.map(r=>{if(!isClosedRecord(r,['id','requestHash'])||!isOperationId(r.id)||r.id!==r.id.toLowerCase()||typeof r.requestHash!=='string'||! /^[a-f0-9]{64}$/.test(r.requestHash)||seen.has(r.id))throw invalid();seen.add(r.id);return {id:r.id,requestHash:r.requestHash};});
}
/** One control transaction commits one sealed result. An uncertain commit is
 * never undone/reissued; the exact completed row survives subsequent retries. */
export async function processWorkerEnrollmentOnce(pool:EnrollmentDatabase,selected:readonly WorkerEnrollmentRequestBinding[],issuerSourceSha:string,encryptionRoot:string,commerceWorkerRoot:string,verifyCompany:WorkerEnrollmentCompanyProbe):Promise<{state:'idle'|'processed'}>{
 const requests=bindings(selected);if(! /^[a-f0-9]{40}$/.test(issuerSourceSha)||!validOnboardingToken(encryptionRoot)||!validOnboardingToken(commerceWorkerRoot)||encryptionRoot===commerceWorkerRoot||typeof verifyCompany!=='function')throw invalid();
 const client=await pool.connect().catch(()=>{throw invalid();});let transaction=false,lost=false,clean=true;const loss=()=>{lost=true;};client.on('error',loss);
 try{
  await client.query('BEGIN');transaction=true;
  const login=(await client.query('SELECT session_user::text AS login,current_user::text AS effective')).rows;
  if(login.length!==1||typeof login[0].login!=='string'||login[0].login!==login[0].effective)throw invalid();
  await assertIssuerPrivileges(client,login[0].login);await assertEnrollmentPrivileges(client,login[0].login,true);
  const receipts=(await client.query('SELECT id::text,request_hash FROM nevora_onboarding.worker_runtime_enrollments WHERE id=ANY($1::uuid[])',[requests.map(r=>r.id)])).rows;
  if(receipts.some(r=>requests.find(x=>x.id===r.id)?.requestHash!==r.request_hash))throw invalid();
  const rows=(await client.query(`SELECT ${queryColumns} FROM nevora_onboarding.worker_runtime_enrollments WHERE id=ANY($1::uuid[]) AND status='PENDING' AND revoked_at IS NULL AND request_expires_at>clock_timestamp() AND expires_at>clock_timestamp() ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1`,[requests.map(r=>r.id)])).rows;
  if(!rows.length){await client.query('COMMIT');transaction=false;return {state:'idle'};}
  const request=fromRow(rows[0]),expected=requests.find(r=>r.id===request.enrollmentId);if(request.issuerSourceSha!==issuerSourceSha||expected?.requestHash!==workerEnrollmentRequestHash(request)||rows[0].request_hash!==expected.requestHash)throw invalid();
  const current=(await client.query(`SELECT id::text,canonical_origin,environment,incarnation::text,revision::text,lifecycle,provider_project_id,app_secret_ref::text,app_role_name::text,worker_secret_ref::text,worker_role_name::text,registration_id::text FROM nevora_onboarding.workspace_registry WHERE id=$1 FOR SHARE`,[request.workspaceId])).rows;
  const workspace=current.length===1?parseWorkspaceRecord(current[0]):null;
  if(!workspace||workspace.lifecycle!=='ACTIVE'||workspace.environment!==request.environment||workspace.incarnation!==request.incarnation||workspace.revision!==request.registryRevision||workspace.workerSecretRef!==request.sourceSecretRef||workspace.workerRoleName!==request.loginRole||workspace.canonicalOrigin!==request.canonicalOrigin||workspace.providerProjectId!==request.providerProjectId)throw invalid();
  const secrets=(await client.query("SELECT ciphertext,login_role::text FROM nevora_onboarding.workspace_secrets WHERE id=$1 AND workspace_id=$2 AND environment=$3 AND incarnation=$4::bigint AND role_kind='WORKER' AND active FOR SHARE",[request.sourceSecretRef,request.workspaceId,request.environment,request.incarnation])).rows;
  if(secrets.length!==1||secrets[0].login_role!==request.loginRole)throw invalid();
  const databaseUrl=openOnboardingValue(secrets[0].ciphertext,`workspace-secret:${request.environment}:${request.workspaceId}:${request.incarnation}:WORKER:${request.sourceSecretRef}`,encryptionRoot);if(!databaseUrl)throw invalid();
  const {registryRevision,recipientPublicKey,requestExpiresAt,...identity}=request;void registryRevision;void requestExpiresAt;
  const material=parseWorkerEnrollmentMaterial({databaseUrl,commerceWorkerSecret:workspaceInstanceSecret(commerceWorkerRoot,request)},identity);
  if(await verifyCompany(identity,material)!==true)throw invalid();
  await assertIssuerPrivileges(client,login[0].login);await assertEnrollmentPrivileges(client,login[0].login,true);
  const envelope=sealWorkerEnrollment(identity,material,recipientPublicKey);
  const changed=(await client.query("UPDATE nevora_onboarding.worker_runtime_enrollments SET status='COMPLETE',key_envelope=$2,ciphertext=$3,issued_at=clock_timestamp() WHERE id=$1 AND status='PENDING' AND revoked_at IS NULL AND request_expires_at>clock_timestamp() AND expires_at>clock_timestamp() RETURNING id",[request.enrollmentId,envelope.keyEnvelope,envelope.ciphertext])).rows;
  if(changed.length!==1)throw invalid();await assertIssuerPrivileges(client,login[0].login);await assertEnrollmentPrivileges(client,login[0].login,true);await client.query('COMMIT');transaction=false;return {state:'processed'};
 }catch{clean=false;throw invalid();}
 finally{if(transaction&&!lost)await client.query('ROLLBACK').catch(()=>{clean=false;});client.release(!clean||lost);client.removeListener('error',loss);}
}
