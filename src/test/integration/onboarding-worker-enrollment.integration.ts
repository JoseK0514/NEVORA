import {beforeAll,expect,it} from 'vitest';
import {generateKeyPairSync,randomBytes,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {Client,Pool} from 'pg';
import {freshOnboardingControl} from './onboarding-fixture';
import {sealOnboardingValue} from '@/lib/onboarding/crypto.server';
import {openWorkerEnrollment,parseWorkerEnrollmentIdentity,workerRecipientFingerprint} from '@/lib/operations/worker-enrollment';
import {configureEnrolledWorkerControlReader,configureWorkerControlReader,workerControlRole} from '@/lib/operations/routing-reader';
import {configureWorkerEnrollmentIssuer,createWorkerEnrollmentRequest,processWorkerEnrollmentOnce,type WorkerEnrollmentRequest} from '@/lib/operations/worker-enrollment-store';
import {workspaceInstanceSecret} from '../../../services/commerce/workspace-enrollment';

const sha='a'.repeat(40),root=Buffer.alloc(32,31).toString('base64url'),workerRoot=Buffer.alloc(32,32).toString('base64url');
type Source={id:string;secretRef:string;loginRole:string;appSecretRef:string;origin:string;databaseUrl:string;project:string};
let recipients:ReturnType<typeof rsa>[];
function rsa(){return generateKeyPairSync('rsa',{modulusLength:3072,publicKeyEncoding:{format:'pem',type:'spki'},privateKeyEncoding:{format:'pem',type:'pkcs8'}});}
beforeAll(()=>{recipients=[rsa(),rsa()];});
async function fixture(options:{sourceActive?:boolean}={}){
 const f=await freshOnboardingControl(),pools:Pool[]=[],roles:string[]=[],source:Source[]=[];
 await f.pool.query(await readFile('db/control-migrations/0007_worker_enrollments.sql','utf8'));
 await f.pool.query(`REVOKE CREATE,TEMPORARY ON DATABASE ${f.name} FROM PUBLIC`);
 for(let i=0;i<2;i++){
  const id=randomUUID(),secretRef=randomUUID(),appSecretRef=randomUUID(),appRole='nv_app_'+randomBytes(12).toString('hex'),loginRole='nv_worker_'+randomBytes(12).toString('hex'),origin=`https://fictional-${i}.portal-staging.nevora.team`,databaseUrl=`postgresql://${loginRole}:fictional-private-password@ep-fictional-${i}.neon.tech/nv_app_${id.replaceAll('-','')}?sslmode=verify-full`;
  await f.pool.query("INSERT INTO nevora_onboarding.workspace_registry(id,canonical_origin,environment,incarnation,revision,lifecycle,provider_project_id,app_secret_ref,app_role_name,worker_secret_ref,worker_role_name) VALUES($1,$2,'test',1,1,'ACTIVE',$3,$4,$5,$6,$7)",[id,origin,'fictional-project-'+i,appSecretRef,appRole,secretRef,loginRole]);
  await f.pool.query("INSERT INTO nevora_onboarding.workspace_secrets(id,workspace_id,environment,incarnation,role_kind,login_role,ciphertext,active) VALUES($1,$2,'test',1,'WORKER',$3,$4,$5)",[secretRef,id,loginRole,sealOnboardingValue(databaseUrl,`workspace-secret:test:${id}:1:WORKER:${secretRef}`,root),i===0?options.sourceActive!==false:true]);
  await f.pool.query("INSERT INTO nevora_onboarding.workspace_secrets(id,workspace_id,environment,incarnation,role_kind,login_role,ciphertext) VALUES($1,$2,'test',1,'APP',$3,$4)",[appSecretRef,id,appRole,sealOnboardingValue(databaseUrl.replace(loginRole,appRole),`workspace-secret:test:${id}:1:APP:${appSecretRef}`,root)]);
  source.push({id,secretRef,appSecretRef,loginRole,origin,databaseUrl,project:'fictional-project-'+i});
 }
 async function login(role:string){const password=randomBytes(32).toString('base64url');roles.push(role);await f.pool.query(`CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD '${password}'; GRANT CONNECT ON DATABASE ${f.name} TO ${role}`);const url=new URL(f.connectionUrl);url.username=role;url.password=password;const pool=new Pool({connectionString:url.href,max:2});pools.push(pool);return pool;}
 const issuer='nv_control_provision_'+randomBytes(12).toString('hex'),issuerPool=await login(issuer);
 // Existing canonical provisioning grants include UPDATE on both tables. These
 // narrow fixture columns also permit PostgreSQL's SELECT ... FOR SHARE locks.
 await f.pool.query(`GRANT USAGE ON SCHEMA nevora_onboarding TO ${issuer}; GRANT SELECT ON nevora_onboarding.workspace_registry,nevora_onboarding.workspace_secrets TO ${issuer}; GRANT UPDATE(revision) ON nevora_onboarding.workspace_registry TO ${issuer}; GRANT UPDATE(active) ON nevora_onboarding.workspace_secrets TO ${issuer}`);
 const legacy=workerControlRole(randomUUID(),'test');await login(legacy);
 const admin=await f.pool.connect();try{await configureWorkerControlReader(admin,legacy);await configureWorkerEnrollmentIssuer(admin,issuer);}finally{admin.release();}
 function request(index=0,patch:Partial<WorkerEnrollmentRequest>={}):WorkerEnrollmentRequest{const s=source[index],now=Date.now(),recipient=recipients[index];return {schemaVersion:1,enrollmentId:randomUUID(),workspaceId:s.id,environment:'test',incarnation:'1',registryRevision:'1',sourceSecretRef:s.secretRef,loginRole:s.loginRole,canonicalOrigin:s.origin,providerProjectId:s.project,recipientPublicKey:recipient.publicKey,recipientFingerprint:workerRecipientFingerprint(recipient.publicKey),issuerSourceSha:sha,requestExpiresAt:new Date(now+600000).toISOString(),expiresAt:new Date(Math.floor(now/1000)*1000+3600123).toISOString(),...patch};}
 const old=await f.pool.query("SELECT md5(string_agg(id::text||ciphertext||active::text,',' ORDER BY id)) AS hash FROM nevora_onboarding.workspace_secrets");
 // Control-only fixture proof: the real company SQL adapter is qualified in
 // onboarding-worker-enrollment-runtime.integration.ts, separately from this store suite.
 const probe=async(identity:import('@/lib/operations/worker-enrollment').WorkerEnrollmentIdentity,material:import('@/lib/operations/worker-enrollment').WorkerEnrollmentMaterial)=>source.some(s=>s.id===identity.workspaceId&&s.databaseUrl===material.databaseUrl&&workspaceInstanceSecret(workerRoot,identity)===material.commerceWorkerSecret);
 return {...f,source,issuer,issuerPool,login,request,probe,async close(){
  expect((await f.pool.query("SELECT md5(string_agg(id::text||ciphertext||active::text,',' ORDER BY id)) AS hash FROM nevora_onboarding.workspace_secrets")).rows).toEqual(old.rows);
  for(const p of pools)await p.end();const u=new URL(f.connectionUrl);u.pathname='/postgres';const cleanup=new Client({connectionString:u.href});await cleanup.connect();
  try{await f.close();for(const role of roles)await cleanup.query('DROP ROLE '+role);}finally{await cleanup.end();}
 }};
}
function identity(row:Record<string,unknown>){return parseWorkerEnrollmentIdentity({schemaVersion:1,enrollmentId:row.id,workspaceId:row.workspace_id,environment:row.environment,incarnation:String(row.incarnation),sourceSecretRef:row.source_secret_ref,loginRole:row.login_role,canonicalOrigin:row.canonical_origin,providerProjectId:row.provider_project_id,recipientFingerprint:row.recipient_fingerprint,issuerSourceSha:row.issuer_source_sha,expiresAt:row.expires_at instanceof Date?row.expires_at.toISOString():new Date(String(row.expires_at)).toISOString()});}

it('issues one immutable company-bound result with real restricted issuer and readers, without changing original custody',async()=>{
 const f=await fixture();try{
  const requests=[f.request(),f.request(1)],bindings=[];for(const r of requests)bindings.push(await createWorkerEnrollmentRequest(f.pool,r));
  expect(await processWorkerEnrollmentOnce(f.issuerPool,bindings,sha,root,workerRoot,f.probe)).toEqual({state:'processed'});expect(await processWorkerEnrollmentOnce(f.issuerPool,bindings,sha,root,workerRoot,f.probe)).toEqual({state:'processed'});expect(await processWorkerEnrollmentOnce(f.issuerPool,bindings,sha,root,workerRoot,f.probe)).toEqual({state:'idle'});
  for(let i=0;i<2;i++){
   const role=workerControlRole(f.source[i].id,'test'),reader=await f.login(role),admin=await f.pool.connect();try{await configureEnrolledWorkerControlReader(admin,role);}finally{admin.release();}
   const rows=(await reader.query('SELECT * FROM nevora_onboarding.worker_workspace_enrollment_secrets')).rows;expect(rows).toHaveLength(1);expect(rows[0].workspace_id).toBe(f.source[i].id);expect(identity(rows[0]).expiresAt).toBe(requests[i].expiresAt);
   expect(openWorkerEnrollment(identity(rows[0]),{schemaVersion:1,keyEnvelope:rows[0].key_envelope,ciphertext:rows[0].ciphertext},recipients[i].privateKey)).toEqual({databaseUrl:f.source[i].databaseUrl,commerceWorkerSecret:workspaceInstanceSecret(workerRoot,{workspaceId:f.source[i].id,environment:'test',incarnation:'1'})});
   expect(openWorkerEnrollment(identity(rows[0]),{schemaVersion:1,keyEnvelope:rows[0].key_envelope,ciphertext:rows[0].ciphertext},recipients[1-i].privateKey)).toBeNull();
   for(const table of ['workspace_secrets','worker_runtime_enrollments','worker_workspace_secrets'])await expect(reader.query('SELECT * FROM nevora_onboarding.'+table)).rejects.toMatchObject({code:'42501'});
   expect((await reader.query('SELECT id FROM nevora_onboarding.worker_workspace_registry')).rows.map(r=>r.id)).toEqual([f.source[i].id]);
  }
  const original=(await f.pool.query('SELECT key_envelope,ciphertext,issued_at FROM nevora_onboarding.worker_runtime_enrollments ORDER BY id')).rows;
  expect(await processWorkerEnrollmentOnce(f.issuerPool,bindings,sha,root,workerRoot,f.probe)).toEqual({state:'idle'});expect((await f.pool.query('SELECT key_envelope,ciphertext,issued_at FROM nevora_onboarding.worker_runtime_enrollments ORDER BY id')).rows).toEqual(original);
  await expect(f.issuerPool.query('DELETE FROM nevora_onboarding.worker_runtime_enrollments')).rejects.toMatchObject({code:'42501'});
  await expect(f.issuerPool.query("UPDATE nevora_onboarding.worker_runtime_enrollments SET recipient_fingerprint=repeat('b',64)")).rejects.toMatchObject({code:'42501'});
  await expect(f.pool.query("UPDATE nevora_onboarding.worker_runtime_enrollments SET ciphertext='changed' WHERE id=$1",[requests[0].enrollmentId])).rejects.toMatchObject({code:'23514'});
 }finally{await f.close();}
});
it('serializes real concurrent claims and keeps completed ciphertext stable on repeated execution',async()=>{
 const f=await fixture();try{
  const binding=await createWorkerEnrollmentRequest(f.pool,f.request()),results=await Promise.all([processWorkerEnrollmentOnce(f.issuerPool,[binding],sha,root,workerRoot,f.probe),processWorkerEnrollmentOnce(f.issuerPool,[binding],sha,root,workerRoot,f.probe)]);
  expect(results.map(r=>r.state).sort()).toEqual(['idle','processed']);expect((await f.pool.query("SELECT count(*)::int AS n FROM nevora_onboarding.worker_runtime_enrollments WHERE status='COMPLETE'")).rows[0].n).toBe(1);
 }finally{await f.close();}
});
it.each(['request-hash','issuer-source','registry-revision','registry-state','incarnation','source-ref','source-app-ref','role','origin','project','request-expiry'] as const)('refuses %s drift before issuing any new credential',async kind=>{
 const f=await fixture();try{
  const patches:Record<typeof kind,Partial<WorkerEnrollmentRequest>>={'request-hash':{},'issuer-source':{},'incarnation':{incarnation:'2'},'source-ref':{sourceSecretRef:f.source[1].secretRef},'source-app-ref':{sourceSecretRef:f.source[0].appSecretRef},'role':{loginRole:'nv_worker_'+randomBytes(12).toString('hex')},'origin':{canonicalOrigin:'https://other.portal-staging.nevora.team'},'project':{providerProjectId:'other-project'},'registry-revision':{registryRevision:'2'},'registry-state':{},'request-expiry':{requestExpiresAt:new Date(Date.now()+5000).toISOString()}};
  const binding=await createWorkerEnrollmentRequest(f.pool,f.request(0,patches[kind]));if(kind==='request-expiry')await f.pool.query('SELECT pg_sleep(GREATEST(0,EXTRACT(EPOCH FROM (request_expires_at-clock_timestamp())))+0.05) FROM nevora_onboarding.worker_runtime_enrollments WHERE id=$1',[binding.id]);
  if(kind==='registry-state')await f.pool.query("UPDATE nevora_onboarding.workspace_registry SET lifecycle='SUSPENDED',revision=revision+1 WHERE id=$1",[f.source[0].id]);
  const selected=kind==='request-hash'?{...binding,requestHash:'b'.repeat(64)}:binding;
  const attempt=processWorkerEnrollmentOnce(f.issuerPool,[selected],kind==='issuer-source'?'b'.repeat(40):sha,root,workerRoot,f.probe);
  if(kind==='request-expiry')expect(await attempt).toEqual({state:'idle'});else await expect(attempt).rejects.toThrow('worker_enrollment_invalid');
  expect((await f.pool.query('SELECT status,key_envelope,ciphertext FROM nevora_onboarding.worker_runtime_enrollments')).rows).toEqual([{status:'PENDING',key_envelope:null,ciphertext:null}]);
 }finally{await f.close();}
});
it('never substitutes a changed request or revives a revoked result',async()=>{
 const f=await fixture();try{
  const request=f.request(),binding=await createWorkerEnrollmentRequest(f.pool,request);expect(await createWorkerEnrollmentRequest(f.pool,request)).toEqual(binding);
  await expect(createWorkerEnrollmentRequest(f.pool,{...request,recipientPublicKey:rsa().publicKey})).rejects.toThrow('worker_enrollment_invalid');
  await expect(createWorkerEnrollmentRequest(f.pool,{...request,recipientPublicKey:recipients[1].publicKey,recipientFingerprint:workerRecipientFingerprint(recipients[1].publicKey)})).rejects.toThrow('worker_enrollment_invalid');
  await expect(f.pool.query("UPDATE nevora_onboarding.worker_runtime_enrollments SET canonical_origin='https://other.portal-staging.nevora.team' WHERE id=$1",[binding.id])).rejects.toMatchObject({code:'23514'});
  await processWorkerEnrollmentOnce(f.issuerPool,[binding],sha,root,workerRoot,f.probe);
  const reader=await f.login(workerControlRole(f.source[0].id,'test')),admin=await f.pool.connect();try{await configureEnrolledWorkerControlReader(admin,workerControlRole(f.source[0].id,'test'));}finally{admin.release();}
  expect((await reader.query('SELECT count(*)::int n FROM nevora_onboarding.worker_workspace_enrollment_secrets')).rows[0].n).toBe(1);
  await f.pool.query('UPDATE nevora_onboarding.worker_runtime_enrollments SET revoked_at=clock_timestamp() WHERE id=$1',[binding.id]);expect((await reader.query('SELECT count(*)::int n FROM nevora_onboarding.worker_workspace_enrollment_secrets')).rows[0].n).toBe(0);
  await expect(f.pool.query('UPDATE nevora_onboarding.worker_runtime_enrollments SET revoked_at=NULL WHERE id=$1',[binding.id])).rejects.toMatchObject({code:'23514'});
  expect(await processWorkerEnrollmentOnce(f.issuerPool,[binding],sha,root,workerRoot,f.probe)).toEqual({state:'idle'});
 }finally{await f.close();}
});
it('refuses one recipient key reused under another operation or company',async()=>{
 const f=await fixture();try{
  const first=f.request();await createWorkerEnrollmentRequest(f.pool,first);
  for(const replacement of [{...first,enrollmentId:randomUUID()},f.request(1,{recipientPublicKey:recipients[0].publicKey,recipientFingerprint:workerRecipientFingerprint(recipients[0].publicKey)})])await expect(createWorkerEnrollmentRequest(f.pool,replacement)).rejects.toThrow('worker_enrollment_invalid');
  expect((await f.pool.query('SELECT count(*)::int n FROM nevora_onboarding.worker_runtime_enrollments')).rows[0].n).toBe(1);
 }finally{await f.close();}
});
it('refuses an owner connection or later privileged issuer flags before processing',async()=>{
 const f=await fixture();try{
  const binding=await createWorkerEnrollmentRequest(f.pool,f.request());
  await expect(processWorkerEnrollmentOnce(f.pool,[binding],sha,root,workerRoot,f.probe)).rejects.toThrow('worker_enrollment_invalid');
  await f.pool.query(`ALTER ROLE ${f.issuer} INHERIT`);await expect(processWorkerEnrollmentOnce(f.issuerPool,[binding],sha,root,workerRoot,f.probe)).rejects.toThrow('worker_enrollment_invalid');
  expect((await f.pool.query('SELECT status FROM nevora_onboarding.worker_runtime_enrollments')).rows).toEqual([{status:'PENDING'}]);
 }finally{await f.close();}
});
it('stops a reader with legacy secret grants and refuses inactive current source custody',async()=>{
 const f=await fixture({sourceActive:false});try{
  const binding=await createWorkerEnrollmentRequest(f.pool,f.request());await expect(processWorkerEnrollmentOnce(f.issuerPool,[binding],sha,root,workerRoot,f.probe)).rejects.toThrow('worker_enrollment_invalid');
  const role=workerControlRole(f.source[0].id,'test');await f.login(role);const admin=await f.pool.connect();try{await configureEnrolledWorkerControlReader(admin,role);await f.pool.query('GRANT SELECT ON nevora_onboarding.worker_workspace_secrets TO '+role);await expect(configureEnrolledWorkerControlReader(admin,role)).rejects.toThrow('operations_reader_scope_invalid');}finally{admin.release();}
 }finally{await f.close();}
});
it('retains the one committed result after actual issuer connection termination loses acknowledgement',async()=>{
 const f=await fixture();try{
  const binding=await createWorkerEnrollmentRequest(f.pool,f.request());let lost=false;
  const interrupted={async connect(){const client=await f.issuerPool.connect(),pid=(await client.query('SELECT pg_backend_pid() AS id')).rows[0].id;return {
   on:(event:'error',listener:()=>void)=>client.on(event,listener),removeListener:(event:'error',listener:()=>void)=>client.removeListener(event,listener),release:(destroy?:boolean)=>client.release(destroy),
   query:async(text:string,values?:unknown[])=>{const result=await client.query(text,values);if(text==='COMMIT'&&!lost){lost=true;await f.pool.query('SELECT pg_terminate_backend($1)',[pid]);throw Error('owned_commit_acknowledgement_lost');}return result;},
  };}};
  await expect(processWorkerEnrollmentOnce(interrupted,[binding],sha,root,workerRoot,f.probe)).rejects.toThrow('worker_enrollment_invalid');expect(lost).toBe(true);
  const original=(await f.pool.query('SELECT status,key_envelope,ciphertext FROM nevora_onboarding.worker_runtime_enrollments')).rows;expect(original[0].status).toBe('COMPLETE');
  expect(await processWorkerEnrollmentOnce(f.issuerPool,[binding],sha,root,workerRoot,f.probe)).toEqual({state:'idle'});expect((await f.pool.query('SELECT status,key_envelope,ciphertext FROM nevora_onboarding.worker_runtime_enrollments')).rows).toEqual(original);
 }finally{await f.close();}
});
it.each([false,undefined,'true',{valid:true}])('refuses unproved company-side worker authority (%s) before publishing a result',async result=>{
 const f=await fixture();try{
  const binding=await createWorkerEnrollmentRequest(f.pool,f.request());
  await expect(processWorkerEnrollmentOnce(f.issuerPool,[binding],sha,root,workerRoot,async()=>result)).rejects.toThrow('worker_enrollment_invalid');
  expect((await f.pool.query('SELECT status,key_envelope,ciphertext FROM nevora_onboarding.worker_runtime_enrollments')).rows).toEqual([{status:'PENDING',key_envelope:null,ciphertext:null}]);
 }finally{await f.close();}
});
it.each(['PUBLIC-TRUNCATE','LOGIN-DELETE','COLUMN-UPDATE','GRANT-OPTION','RLS','TRIGGER'] as const)('F4 refuses %s drift at setup and issuance without publishing an envelope',async kind=>{
 const f=await fixture();const table='nevora_onboarding.worker_runtime_enrollments';try{
  const binding=await createWorkerEnrollmentRequest(f.pool,f.request()),grants={
   'PUBLIC-TRUNCATE':[`GRANT TRUNCATE ON ${table} TO PUBLIC`,`REVOKE TRUNCATE ON ${table} FROM PUBLIC`],
   'LOGIN-DELETE':[`GRANT DELETE ON ${table} TO ${f.issuer}`,`REVOKE DELETE ON ${table} FROM ${f.issuer}`],
   'COLUMN-UPDATE':[`GRANT UPDATE(request_hash) ON ${table} TO ${f.issuer}`,`REVOKE UPDATE(request_hash) ON ${table} FROM ${f.issuer}`],
   'GRANT-OPTION':[`GRANT UPDATE(ciphertext) ON ${table} TO ${f.issuer} WITH GRANT OPTION`,`REVOKE GRANT OPTION FOR UPDATE(ciphertext) ON ${table} FROM ${f.issuer}`],
   'RLS':[`ALTER TABLE ${table} NO FORCE ROW LEVEL SECURITY`,`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`],
   'TRIGGER':[`ALTER TABLE ${table} DISABLE TRIGGER worker_enrollment_immutable`,`ALTER TABLE ${table} ENABLE TRIGGER worker_enrollment_immutable`],
  }[kind];await f.pool.query(grants[0]);
  try{const admin=await f.pool.connect();try{await expect(configureWorkerEnrollmentIssuer(admin,f.issuer)).rejects.toThrow('worker_enrollment_invalid');}finally{admin.release();}
   await expect(processWorkerEnrollmentOnce(f.issuerPool,[binding],sha,root,workerRoot,f.probe)).rejects.toThrow('worker_enrollment_invalid');
   expect((await f.pool.query('SELECT status,ciphertext FROM '+table)).rows).toEqual([{status:'PENDING',ciphertext:null}]);
  }finally{await f.pool.query(grants[1]);}
 }finally{await f.close();}
});
it('F6 rejects a pool before any setup write and preserves the existing policy on actual client mid-DDL failure',async()=>{
 const f=await fixture(),pool=new Pool({connectionString:f.connectionUrl,maxUses:1,max:1}),query="SELECT count(*)::int n FROM pg_catalog.pg_policies WHERE schemaname='nevora_onboarding' AND tablename='worker_runtime_enrollments' AND policyname=$1",values=['enrollment_issuer_'+f.issuer.slice(-24)];
 try{
  expect((await f.pool.query(query,values)).rows).toEqual([{n:1}]);
  // Unsupported runtime callers cannot accidentally split a transaction across pool connections.
  await expect(configureWorkerEnrollmentIssuer(pool,f.issuer)).rejects.toThrow('worker_enrollment_invalid');expect((await f.pool.query(query,values)).rows).toEqual([{n:1}]);
  await f.pool.query("CREATE FUNCTION public.enrollment_reject_policy() RETURNS event_trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture_reject_policy'; END $$; CREATE EVENT TRIGGER enrollment_reject_policy ON ddl_command_start WHEN TAG IN ('CREATE POLICY') EXECUTE FUNCTION public.enrollment_reject_policy()");
  const admin=await f.pool.connect();try{await expect(configureWorkerEnrollmentIssuer(admin,f.issuer)).rejects.toThrow('worker_enrollment_invalid');}finally{admin.release();}
  expect((await f.pool.query(query,values)).rows).toEqual([{n:1}]);
  expect((await f.issuerPool.query("SELECT has_column_privilege(current_user,'nevora_onboarding.worker_runtime_enrollments','ciphertext','UPDATE') allowed")).rows).toEqual([{allowed:true}]);
 }finally{await pool.end();await f.close();}
});
it('F4 rechecks effective issuer authority after the asynchronous company proof before committing any result',async()=>{
 const f=await fixture();try{
  const binding=await createWorkerEnrollmentRequest(f.pool,f.request()),probe=async(identity:import('@/lib/operations/worker-enrollment').WorkerEnrollmentIdentity,material:import('@/lib/operations/worker-enrollment').WorkerEnrollmentMaterial)=>{const valid=await f.probe(identity,material);await f.pool.query('GRANT TRUNCATE ON nevora_onboarding.worker_runtime_enrollments TO PUBLIC');return valid;};
  try{await expect(processWorkerEnrollmentOnce(f.issuerPool,[binding],sha,root,workerRoot,probe)).rejects.toThrow('worker_enrollment_invalid');expect((await f.pool.query('SELECT status,ciphertext FROM nevora_onboarding.worker_runtime_enrollments')).rows).toEqual([{status:'PENDING',ciphertext:null}]);}finally{await f.pool.query('REVOKE TRUNCATE ON nevora_onboarding.worker_runtime_enrollments FROM PUBLIC');}
 }finally{await f.close();}
});
it('F4 rechecks actual issuer flags after asynchronous company proof',async()=>{
 const f=await fixture();try{
  const binding=await createWorkerEnrollmentRequest(f.pool,f.request()),probe=async(identity:import('@/lib/operations/worker-enrollment').WorkerEnrollmentIdentity,material:import('@/lib/operations/worker-enrollment').WorkerEnrollmentMaterial)=>{const valid=await f.probe(identity,material);await f.pool.query('ALTER ROLE '+f.issuer+' INHERIT');return valid;};
  try{await expect(processWorkerEnrollmentOnce(f.issuerPool,[binding],sha,root,workerRoot,probe)).rejects.toThrow('worker_enrollment_invalid');expect((await f.pool.query('SELECT status,ciphertext FROM nevora_onboarding.worker_runtime_enrollments')).rows).toEqual([{status:'PENDING',ciphertext:null}]);}finally{await f.pool.query('ALTER ROLE '+f.issuer+' NOINHERIT');}
 }finally{await f.close();}
});
