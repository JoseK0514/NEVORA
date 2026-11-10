import {afterAll,afterEach,beforeAll,expect,it,vi} from 'vitest';
import {createHash,generateKeyPairSync,randomBytes,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {Pool} from 'pg';
import {onboardingJourneyFixture} from './onboarding-journey-fixture';
import {createControlStore} from '@/lib/onboarding/control-store.server';
import {configureWorkerEnrollmentIssuer,createWorkerEnrollmentRequest,processWorkerEnrollmentOnce,type WorkerEnrollmentRequest} from '@/lib/operations/worker-enrollment-store';
import {workerRecipientFingerprint} from '@/lib/operations/worker-enrollment';
import {verifyWorkerEnrollmentCompany} from '@/lib/operations/worker-enrollment-company';
import {configureEnrolledWorkerControlReader,workerControlRole} from '@/lib/operations/routing-reader';
import {readWorkerRoutingConfig} from '@/lib/workspace-routing/config.server';
import {resolveWorkspaceBinding,type WorkspaceBinding} from '@/lib/workspace-routing/resolver.server';
import {readWorkerEnrollmentMaterial} from '@/lib/operations/worker-enrollment-runtime.server';
import {readQueueHealth} from '@/lib/operations/queue-health';
import {getWorkspaceDb} from '@/lib/workspace-routing/transport.server';
import {withWorkspaceBinding} from '@/lib/workspace-routing/context.server';
import {isolatedCommerceConnection} from '@/lib/commerce/isolated-connection.server';
import {workspaceInstanceSecret} from '../../../services/commerce/workspace-enrollment';
const ownerRoot=Buffer.alloc(32,41).toString('base64url'),workerRoot=Buffer.alloc(32,42).toString('base64url'),sha='a'.repeat(40);
let f:Awaited<ReturnType<typeof onboardingJourneyFixture>>,a:Awaited<ReturnType<Awaited<ReturnType<typeof onboardingJourneyFixture>>['activateCompany']>>,b:typeof a;
const readers:Pool[]=[],roles:string[]=[];
let originalHashes:unknown;
beforeAll(async()=>{
 f=await onboardingJourneyFixture({restrictedControl:true,commerce:{key:ownerRoot,workerKey:workerRoot,enroll:async()=>{}}});
 a=await f.activateCompany(await f.createCompany());b=await f.activateCompany(await f.createCompany('fictional-second','second@example.invalid'));
 await f.db.pool.query(await readFile('db/control-migrations/0007_worker_enrollments.sql','utf8'));
 await f.db.pool.query(`REVOKE CREATE,TEMPORARY ON DATABASE ${f.db.name} FROM PUBLIC`);
 const admin=await f.db.pool.connect();try{await configureWorkerEnrollmentIssuer(admin,f.principals!.roles[1]);}finally{admin.release();}
 originalHashes=(await f.db.pool.query("SELECT id,ciphertext,active FROM nevora_onboarding.workspace_secrets ORDER BY id")).rows;
},60000);
afterEach(()=>{vi.unstubAllEnvs();});
afterAll(async()=>{
 if(!f)return;try{expect((await f.db.pool.query('SELECT id,ciphertext,active FROM nevora_onboarding.workspace_secrets ORDER BY id')).rows).toEqual(originalHashes);}finally{for(const p of readers)await p.end();for(const role of roles){await f.db.pool.query('DROP OWNED BY '+role);await f.db.pool.query('DROP ROLE '+role);}await f.close();}
});
async function enrollment(company=a,options:{runtimeMs?:number;issue?:boolean}={}){
 const row=(await f.db.pool.query('SELECT * FROM nevora_onboarding.workspace_registry WHERE id=$1',[company.c.row.workspace_id])).rows[0],pair=generateKeyPairSync('rsa',{modulusLength:3072,publicKeyEncoding:{format:'pem',type:'spki'},privateKeyEncoding:{format:'pem',type:'pkcs8'}}),now=Date.now(),runtimeMs=options.runtimeMs??3600000;
 const request:WorkerEnrollmentRequest={schemaVersion:1,enrollmentId:randomUUID(),workspaceId:row.id,environment:'test',incarnation:String(row.incarnation),registryRevision:String(row.revision),sourceSecretRef:row.worker_secret_ref,loginRole:row.worker_role_name,canonicalOrigin:row.canonical_origin,providerProjectId:row.provider_project_id,recipientPublicKey:pair.publicKey,recipientFingerprint:workerRecipientFingerprint(pair.publicKey),issuerSourceSha:sha,requestExpiresAt:new Date(now+Math.min(600000,runtimeMs/2)).toISOString(),expiresAt:new Date(now+runtimeMs).toISOString()};
 const selected=await createWorkerEnrollmentRequest(f.db.pool,request);
 if(options.issue!==false)expect(await processWorkerEnrollmentOnce(f.principals!.pools[1],[selected],sha,f.config.encryptionKey,workerRoot,verifyWorkerEnrollmentCompany)).toEqual({state:'processed'});
 const role=workerControlRole(row.id,'test');let pool=readers[roles.indexOf(role)],url:string;
 if(!pool){const password=randomBytes(32).toString('base64url');roles.push(role);await f.db.pool.query(`CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS NOREPLICATION PASSWORD '${password}'; GRANT CONNECT ON DATABASE ${f.db.name} TO ${role}`);const u=new URL(f.db.connectionUrl);u.username=role;u.password=password;url=u.href;pool=new Pool({connectionString:url,max:2});readers.push(pool);const admin=await f.db.pool.connect();try{await configureEnrolledWorkerControlReader(admin,role);}finally{admin.release();}}
 else url=pool.options.connectionString!;
 const env={NEVORA_WORKSPACE_MODE:'isolated',NEVORA_ONBOARDING_ENVIRONMENT:'test',NEVORA_PORTAL_BASE_DOMAIN:f.config.portalBaseDomain,NEVORA_CONTROL_DATABASE_URL:url,NEVORA_WORKER_ENROLLMENT_ID:request.enrollmentId,NEVORA_WORKER_RECIPIENT_PRIVATE_KEY:pair.privateKey},config=readWorkerRoutingConfig(env),store=createControlStore(pool),binding=await resolveWorkspaceBinding({origin:company.c.origin},store,config,'WORKER');
 return {request,selected,pair,role,pool,env,store,config,binding};
}
it('proves real company WORKER identity and commerce hash before publishing, rejecting an Owner-root substitution',async()=>{
 const e=await enrollment(a,{issue:false});
 await expect(processWorkerEnrollmentOnce(f.principals!.pools[1],[e.selected],sha,f.config.encryptionKey,ownerRoot,verifyWorkerEnrollmentCompany)).rejects.toThrow('worker_enrollment_invalid');
 expect((await f.db.pool.query('SELECT status,ciphertext FROM nevora_onboarding.worker_runtime_enrollments WHERE id=$1',[e.request.enrollmentId])).rows).toEqual([{status:'PENDING',ciphertext:null}]);
 expect(await processWorkerEnrollmentOnce(f.principals!.pools[1],[e.selected],sha,f.config.encryptionKey,workerRoot,verifyWorkerEnrollmentCompany)).toEqual({state:'processed'});
 const material=await readWorkerEnrollmentMaterial(e.binding),{registryRevision,recipientPublicKey,requestExpiresAt,...identity}=e.request;void registryRevision;void recipientPublicKey;void requestExpiresAt;expect(await verifyWorkerEnrollmentCompany(identity,material)).toBe(true);
 expect(await verifyWorkerEnrollmentCompany({...identity,providerProjectId:'other-project'},material)).toBe(false);
 expect(await verifyWorkerEnrollmentCompany(identity,{...material,commerceWorkerSecret:workspaceInstanceSecret(ownerRoot,e.request)})).toBe(false);
});
it('runs the canonical company SQL and Worker commerce connection using only a recipient key',async()=>{
 const e=await enrollment(),db=getWorkspaceDb(e.binding),material=await readWorkerEnrollmentMaterial(e.binding);
 expect(await db.query({text:'SELECT current_user::text AS login',values:[]})).toEqual([{login:e.request.loginRole}]);
 expect(await readQueueHealth(db,'test')).toMatchObject({workspaceId:e.request.workspaceId});
 await expect(db.query({text:'SELECT * FROM employee_credentials',values:[]})).rejects.toMatchObject({code:'42501'});
 vi.stubEnv('NEVORA_WORKSPACE_MODE','isolated');vi.stubEnv('NEVORA_COMMERCE_API_ORIGIN','https://fictional-commerce.example.invalid');vi.stubEnv('NEVORA_COMMERCE_WORKER_BINDING_KEY',undefined);vi.stubEnv('NEVORA_COMMERCE_BINDING_KEY',undefined);
 const connection=await withWorkspaceBinding(e.binding,isolatedCommerceConnection);expect(connection.role).toBe('WORKER');expect(connection.secret).toBe(material.commerceWorkerSecret);expect(connection.secret).not.toBe(workspaceInstanceSecret(ownerRoot,e.request));
 expect(createHash('sha256').update(connection.secret).digest('hex')).toBe((await a.c.resource.db.pool.query('SELECT worker_secret_hash FROM nevora_commerce_installation')).rows[0].worker_secret_hash);
 vi.stubEnv('NEVORA_COMMERCE_BINDING_KEY',ownerRoot);await expect(withWorkspaceBinding(e.binding,isolatedCommerceConnection)).rejects.toThrow('worker_owner_key_forbidden');
});
it('refuses foreign company routing, a substituted recipient and a forged binding',async()=>{
 const first=await enrollment(),second=await enrollment(b);
 await expect(resolveWorkspaceBinding({origin:b.c.origin},first.store,first.config,'WORKER')).rejects.toThrow('Workspace is unavailable');
 const swapped=readWorkerRoutingConfig({...first.env,NEVORA_WORKER_RECIPIENT_PRIVATE_KEY:second.pair.privateKey});
 await expect(readWorkerEnrollmentMaterial(await resolveWorkspaceBinding({origin:a.c.origin},first.store,swapped,'WORKER'))).rejects.toThrow('Workspace is unavailable');
 await expect(readWorkerEnrollmentMaterial({} as WorkspaceBinding)).rejects.toThrow('Workspace is unavailable');
});
it('reaudits effective control privileges before reading an envelope',async()=>{
 const e=await enrollment();expect((await readWorkerEnrollmentMaterial(e.binding)).databaseUrl).toContain(e.request.loginRole);
 await f.db.pool.query('GRANT SELECT(ciphertext) ON nevora_onboarding.workspace_secrets TO '+e.role);
 try{await expect(readWorkerEnrollmentMaterial(e.binding)).rejects.toThrow('Workspace is unavailable');}finally{await f.db.pool.query('REVOKE SELECT(ciphertext) ON nevora_onboarding.workspace_secrets FROM '+e.role);}
});
it('fails a previously cached transport after enrollment revocation while the underlying Worker login remains usable',async()=>{
 const e=await enrollment(),db=getWorkspaceDb(e.binding),material=await readWorkerEnrollmentMaterial(e.binding);expect(await db.query({text:'SELECT 1 AS n',values:[]})).toEqual([{n:1}]);
 await f.db.pool.query('UPDATE nevora_onboarding.worker_runtime_enrollments SET revoked_at=clock_timestamp() WHERE id=$1',[e.request.enrollmentId]);
 await expect(db.query({text:'SELECT 1 AS n',values:[]})).rejects.toThrow('Workspace is unavailable');
 // This is admission revocation, not password rotation: prove the residual login.
 const {neon}=await import('@neondatabase/serverless');expect(await neon(material.databaseUrl).query('SELECT current_user::text AS login')).toEqual([{login:e.request.loginRole}]);
});
it('expires both material reads and a previously cached canonical transport',async()=>{
 const e=await enrollment(a,{runtimeMs:2500}),db=getWorkspaceDb(e.binding);expect(await db.query({text:'SELECT 1 AS n',values:[]})).toEqual([{n:1}]);
 await expect(readWorkerEnrollmentMaterial(e.binding,Date.parse(e.request.expiresAt))).rejects.toThrow('Workspace is unavailable');
 await f.db.pool.query('SELECT pg_sleep(GREATEST(0,EXTRACT(EPOCH FROM (expires_at-clock_timestamp())))+0.05) FROM nevora_onboarding.worker_runtime_enrollments WHERE id=$1',[e.request.enrollmentId]);
 await expect(db.query({text:'SELECT 1 AS n',values:[]})).rejects.toThrow('Workspace is unavailable');
});
it('denies current company role escalation and lifecycle drift after a successful call',async()=>{
 const e=await enrollment(),db=getWorkspaceDb(e.binding);await db.query({text:'SELECT 1 AS n',values:[]});
 await a.c.resource.db.pool.query('ALTER ROLE '+e.request.loginRole+' INHERIT');
 try{await expect(db.query({text:'SELECT 1 AS n',values:[]})).rejects.toThrow('Workspace is unavailable');}finally{await a.c.resource.db.pool.query('ALTER ROLE '+e.request.loginRole+' NOINHERIT');}
 await f.db.pool.query("UPDATE nevora_onboarding.workspace_registry SET lifecycle='SUSPENDED',revision=revision+1 WHERE id=$1",[e.request.workspaceId]);
 try{await expect(db.query({text:'SELECT 1 AS n',values:[]})).rejects.toThrow('Workspace is unavailable');}finally{await f.db.pool.query("UPDATE nevora_onboarding.workspace_registry SET lifecycle='ACTIVE',revision=revision+1 WHERE id=$1",[e.request.workspaceId]);}
});
