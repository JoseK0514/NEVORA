import {provisioningHttpHandlers} from '@/lib/onboarding/provisioning/http.server';
import {OwnedProvisioningProvider} from './onboarding-provider-fixture';
import {runProvisioningJob} from '@/lib/onboarding/provisioning/orchestrator.server';
import {ControlCommitUnknown,createControlStore,type ControlStore} from '@/lib/onboarding/control-store.server';
import {onboardingTestConfig} from './onboarding-test-config';
import {requestRegistration,verifyRegistration,readRegistration} from '@/lib/onboarding/registration.server';
import {requestWorkspace,readProvisioningOperation,claimProvisioningJob} from '@/lib/onboarding/provisioning/store.server';
import {it,expect,describe,beforeAll,afterAll,beforeEach} from 'vitest';
import {Client,type QueryResultRow} from 'pg';
import {randomUUID,randomBytes} from 'node:crypto';
import {freshOnboardingDatabase,freshOnboardingControl} from './onboarding-fixture';
import {resourceIdentity} from '@/lib/onboarding/provisioning/model';
import {bootstrapPendingCompany,canonicalCompanyManifest} from '@/lib/company-bootstrap/server';
import {setupCompany} from '../../../scripts/company-setup';
const payload={businessName:'Fictional North Studio',timeZone:'America/Chicago',requestedSlug:'fictional-north',initialLocation:{name:'Main Studio',shortName:'Main',key:'main'},ownerProfile:{id:'OWNER-1',firstName:'Fictional',lastName:'Owner',phone:'787-555-0101'}};
it('atomically installs only canonical migrations, a pending Owner without credentials and an exact recovery receipt',async()=>{
 const operationId=randomUUID(),workspaceId=randomUUID(),registrationId=randomUUID(),identity=resourceIdentity({operationId,workspaceId,environment:'test',accountRef:'fictional-org',region:'aws-us-east-1',createdAt:new Date().toISOString()},Buffer.alloc(32,4).toString('base64url'));
 const db=await freshOnboardingDatabase(identity.databaseName),admin=new Client({connectionString:db.connectionUrl});await admin.connect();let client:Client|undefined;
 try{
  await admin.query(`CREATE ROLE ${identity.provisionerRole} LOGIN NOSUPERUSER NOCREATEDB CREATEROLE NOINHERIT NOBYPASSRLS NOREPLICATION PASSWORD 'fictional-owned-provisioner-password'`);
  await admin.query('ALTER DATABASE '+db.name+' OWNER TO '+identity.provisionerRole);
  const url=new URL(db.connectionUrl);url.username=identity.provisionerRole;url.password='fictional-owned-provisioner-password';client=new Client({connectionString:url.href});await client.connect();
  const spec={operationId,workspaceId,registrationId,environment:'test' as const,incarnation:'1',providerProjectId:'fictional-project',resourceName:identity.name,commandHash:'a'.repeat(64),payload,verifiedEmail:'fictional-owner@example.invalid',databaseName:db.name,provisionerRole:identity.provisionerRole,app:{name:identity.appRole,password:randomBytes(32).toString('base64url')},worker:{name:identity.workerRole,password:randomBytes(32).toString('base64url')}};
  const result=await bootstrapPendingCompany(client,spec),again=await bootstrapPendingCompany(client,spec);expect(again).toEqual(result);
  expect((await admin.query('SELECT id,role,active FROM employees')).rows).toEqual([{id:'OWNER-1',role:'OWNER',active:false}]);expect((await admin.query('SELECT count(*)::int n FROM employee_credentials')).rows[0].n).toBe(0);
  expect((await admin.query('SELECT manifest_hash FROM onboarding_provision_receipts')).rows[0].manifest_hash).toBe((await canonicalCompanyManifest()).hash);
  expect((await admin.query("SELECT count(*)::int n FROM pg_tables WHERE schemaname='public' AND tablename LIKE '%tenant%'")).rows[0].n).toBe(0);
  await expect(bootstrapPendingCompany(client,{...spec,commandHash:'b'.repeat(64)})).rejects.toThrow();
  const appUrl=new URL(db.connectionUrl);appUrl.username=spec.app.name;appUrl.password=spec.app.password;const appClient=new Client({connectionString:appUrl.href});await appClient.connect();
  try{expect((await appClient.query('SELECT lifecycle FROM onboarding_workspace_identity')).rows[0].lifecycle).toBe('OWNER_ACTIVATION_REQUIRED');
   expect((await appClient.query('SELECT count(*)::int n FROM owner_advisor_memories')).rows[0].n).toBe(0);
   expect((await appClient.query("SELECT to_regprocedure('owner_advisor_save_memory(text,text,uuid,text,integer,jsonb,jsonb)') IS NOT NULL AS installed")).rows[0].installed).toBe(true);
   await expect(appClient.query('SELECT token_digest FROM onboarding_owner_grants')).rejects.toMatchObject({code:'42501'});
   await expect(appClient.query('UPDATE onboarding_workspace_identity SET incarnation=2')).rejects.toMatchObject({code:'42501'});
   expect((await appClient.query("SELECT has_database_privilege(current_user,current_database(),'TEMP') AS temporary")).rows[0].temporary).toBe(false);
   expect((await appClient.query("SELECT has_function_privilege(current_user,'nevora_submit_delegated_time_correction(uuid,text,text,text,text,text,text,text,timestamptz,timestamptz,text,text)','EXECUTE') AS base,has_function_privilege(current_user,'nevora_submit_delegated_time_correction(uuid,text,text,text,text,text,text,text,timestamptz,timestamptz,text,text,uuid,integer)','EXECUTE') AS supersession")).rows[0]).toEqual({base:true,supersession:true});
   expect((await appClient.query(`SELECT has_table_privilege(current_user,'management_time_closes','SELECT') AS read,
    has_table_privilege(current_user,'management_time_closes','INSERT') AS insert,
    has_table_privilege(current_user,'management_time_closes','UPDATE') AS update,
    has_table_privilege(current_user,'management_time_closes','DELETE') AS delete,
    has_table_privilege(current_user,'management_time_closes','TRUNCATE') AS truncate,
    has_function_privilege(current_user,'nevora_management_close_source(text,text)','EXECUTE') AS source,
    has_function_privilege(current_user,'nevora_management_close(text,text,text,text,text,text,uuid,text,timestamptz,text,text)','EXECUTE') AS close`)).rows[0]).toEqual({read:true,insert:true,update:false,delete:false,truncate:false,source:true,close:true});
  }finally{await appClient.end();}

  const workerUrl=new URL(db.connectionUrl);workerUrl.username=spec.worker.name;workerUrl.password=spec.worker.password;const workerClient=new Client({connectionString:workerUrl.href});await workerClient.connect();try{
   await expect(workerClient.query("INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES('OWNER-1','attacker',false)")).rejects.toMatchObject({code:'42501'});
   await expect(workerClient.query("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,'OWNER-1',clock_timestamp()+interval '1 hour')",['a'.repeat(64)])).rejects.toMatchObject({code:'42501'});
   await expect(workerClient.query("UPDATE employees SET role='EMPLOYEE' WHERE id='OWNER-1'")).rejects.toMatchObject({code:'42501'});
   await expect(workerClient.query('SELECT password_hash FROM employee_credentials')).rejects.toMatchObject({code:'42501'});
   expect((await workerClient.query("SELECT has_function_privilege(current_user,'nevora_submit_delegated_time_correction(uuid,text,text,text,text,text,text,text,timestamptz,timestamptz,text,text)','EXECUTE') AS base,has_function_privilege(current_user,'nevora_submit_delegated_time_correction(uuid,text,text,text,text,text,text,text,timestamptz,timestamptz,text,text,uuid,integer)','EXECUTE') AS supersession")).rows[0]).toEqual({base:false,supersession:false});
   expect((await workerClient.query(`SELECT has_table_privilege(current_user,'management_time_closes','SELECT') AS read,
    has_table_privilege(current_user,'management_time_closes','INSERT') AS insert,
    has_function_privilege(current_user,'nevora_management_close_source(text,text)','EXECUTE') AS source,
    has_function_privilege(current_user,'nevora_management_close(text,text,text,text,text,text,uuid,text,timestamptz,text,text)','EXECUTE') AS close`)).rows[0]).toEqual({read:false,insert:false,source:false,close:false});
  }finally{await workerClient.end();}
  await admin.query('UPDATE onboarding_workspace_identity SET incarnation=incarnation+1');
  await expect(bootstrapPendingCompany(client,spec)).rejects.toThrow();
 }finally{
  await client?.end();await admin.end();await db.close();
  // The roles belong only to this invocation's cluster; clean after dropping their database.
  const cleanup=await freshOnboardingDatabase();try{for(const role of [identity.appRole,identity.workerRole,identity.provisionerRole])await cleanup.pool.query('DROP ROLE IF EXISTS '+role);}finally{await cleanup.close();}
 }
});
it('preserves the legacy fresh-company CLI active Owner and second-run refusal',async()=>{
 const db=await freshOnboardingDatabase(),client=new Client({connectionString:db.connectionUrl});await client.connect();
 try{const input={name:'Fictional Legacy Company',timeZone:'America/Chicago',locationName:'Main',locationShortName:'Main',locationKey:'main',owner:{id:'LEGACY-OWNER',firstName:'Fictional',lastName:'Owner',phone:'787-555-0101',email:null,password:'Fictional legacy password 123!'}};const result=await setupCompany(client,input);expect(result.workspaceId).toBeTruthy();expect((await client.query('SELECT role,active FROM employees')).rows).toEqual([{role:'OWNER',active:true}]);expect((await client.query('SELECT count(*)::int n FROM employee_credentials')).rows[0].n).toBe(1);await expect(setupCompany(client,input)).rejects.toThrow('empty public schema');}
 finally{await client.end();await db.close();}
});


describe('verified control-plane provisioning commands',()=>{
 let db:Awaited<ReturnType<typeof freshOnboardingControl>>,store:ReturnType<typeof createControlStore>;
 const config=onboardingTestConfig({NEVORA_ONBOARDING_PROVIDER_ENABLED:'true',NEVORA_ONBOARDING_MAX_NEW_PROJECTS_PER_DAY:'10',NEVORA_ONBOARDING_PROVIDER_ACCOUNT_REF:'fictional-org',NEVORA_ONBOARDING_RESOURCE_POLICY_VERSION:'fictional-policy-1'});
 beforeAll(async()=>{db=await freshOnboardingControl();store=createControlStore(db.pool);});afterAll(async()=>{await db?.close();});
 beforeEach(async()=>{await db.pool.query('TRUNCATE nevora_onboarding.registrations,nevora_onboarding.admission_counters,nevora_onboarding.email_subjects CASCADE');});
 async function verified(email:string){let proof='';await requestRegistration({schemaVersion:1,operationId:randomUUID(),email,locale:'en',termsVersion:config.termsVersion,privacyVersion:config.privacyVersion},store,{async send(message){proof=message.proof;return {providerAccepted:true};}},config,'127.0.0.1');const result=await verifyRegistration({operationId:randomUUID(),proof},store,config);if(result.state!=='verified')throw Error('Owned signup verification failed');return result;}
 const command=(version:string,slug='fictional-north')=>({schemaVersion:1,operationId:randomUUID(),expectedVersion:version,payload:{...payload,requestedSlug:slug}});
 it('serializes identical submits and returns the same durable operation without duplicate workspace reservation',async()=>{
  const actor=await verified('owner-a@example.invalid'),c=command(actor.snapshot.version);const results=await Promise.all([requestWorkspace(actor.session,c,store,config),requestWorkspace(actor.session,c,store,config)]);expect(results.map(r=>r.state)).toEqual(['pending','pending']);expect((await db.pool.query('SELECT count(*)::int n FROM nevora_onboarding.provisioning_operations')).rows[0].n).toBe(1);expect((await db.pool.query('SELECT count(*)::int n FROM nevora_onboarding.workspace_registry')).rows[0].n).toBe(1);
  expect((await requestWorkspace(actor.session,{...c,payload:{...c.payload,businessName:'Changed'}},store,config)).state).toBe('conflict');
 });
 it('reserves a slug for only one verified actor under concurrent requests',async()=>{
  const [a,b]=await Promise.all([verified('owner-a@example.invalid'),verified('owner-b@example.invalid')]);const r=await Promise.all([requestWorkspace(a.session,command(a.snapshot.version),store,config),requestWorkspace(b.session,command(b.snapshot.version),store,config)]);expect(r.map(x=>x.state).sort()).toEqual(['conflict','pending']);expect((await db.pool.query('SELECT count(*)::int n FROM nevora_onboarding.provisioning_operations')).rows[0].n).toBe(1);
 });
 it('rejects fabricated signup custody and keeps operation polling actor-scoped',async()=>{
  const a=await verified('owner-a@example.invalid'),b=await verified('owner-b@example.invalid'),c=command(a.snapshot.version);expect((await requestWorkspace({} as never,c,store,config)).state).toBe('unavailable');await requestWorkspace(a.session,c,store,config);expect((await readProvisioningOperation(b.session,c.operationId,store,config)).state).toBe('unavailable');const result=await readProvisioningOperation(a.session,c.operationId,store,config);expect(result.state).toBe('pending');expect(JSON.stringify(result)).not.toMatch(/ciphertext|password|email|connection|secret|token/i);
 });
 it('rejects a verified proof used with another environment or unaccepted policy version',async()=>{
  const a=await verified('owner-a@example.invalid'),c=command(a.snapshot.version);expect((await requestWorkspace(a.session,c,store,{...config,environment:'production'})).state).toBe('unavailable');expect((await requestWorkspace(a.session,c,store,{...config,termsVersion:'new-terms'})).state).toBe('invalid');expect((await db.pool.query('SELECT count(*)::int n FROM nevora_onboarding.provisioning_operations')).rows[0].n).toBe(0);
 });
 it('does not promote an unclaimed public policy request into the verified signup actor consent',async()=>{
  const a=await verified('owner-a@example.invalid'),newConfig={...config,termsVersion:'terms-2'};
  await db.pool.query("UPDATE nevora_onboarding.email_subjects SET last_sent_at=clock_timestamp()-interval '2 minutes'");
  await requestRegistration({schemaVersion:1,operationId:randomUUID(),email:'owner-a@example.invalid',locale:'en',termsVersion:'terms-2',privacyVersion:config.privacyVersion},store,{async send(){return {providerAccepted:true};}},newConfig,'127.0.0.1');
  const current=await readRegistration(a.session,store);expect(current).not.toBeNull();expect((await requestWorkspace(a.session,command(current!.version),store,newConfig)).state).toBe('invalid');
 });
 it('uses the verified HttpOnly signup cookie for actual HTTP creation and polling without projecting private custody',async()=>{
  const a=await verified('owner-a@example.invalid'),c=command(a.snapshot.version),h=provisioningHttpHandlers({config,store}),url=config.signupOrigin+'/api/onboarding/workspaces';
  const make=(cookie:string)=>new Request(url,{method:'POST',headers:{origin:config.signupOrigin,'content-type':'application/json',cookie},body:JSON.stringify(c)});
  expect((await h.request(make('nevora_signup='+a.sessionToken+'; nevora_signup='+a.sessionToken))).status).toBe(401);
  const r=await h.request(make('nevora_signup='+a.sessionToken));expect(r.status).toBe(202);expect(JSON.stringify(await r.json())).not.toMatch(/ciphertext|password|email|secret|token/i);
  const current=await h.read(new Request(config.signupOrigin+'/api/onboarding/operations/current',{headers:{cookie:'nevora_signup='+a.sessionToken}}),'current');expect(current.status).toBe(202);expect(await current.json()).toMatchObject({state:'pending',operationId:c.operationId});
  const poll=await h.read(new Request(config.signupOrigin+'/api/onboarding/operations/'+c.operationId,{headers:{cookie:'nevora_signup='+a.sessionToken}}),c.operationId);expect(poll.status).toBe(202);expect(await poll.json()).toMatchObject({state:'pending',operationId:c.operationId});
 });
 it('enforces the daily reservation allowance before a second resource is queued',async()=>{
  const a=await verified('owner-a@example.invalid'),b=await verified('owner-b@example.invalid'),limited={...config,maxNewProjectsPerDay:1};expect((await requestWorkspace(a.session,command(a.snapshot.version,'alpha'),store,limited)).state).toBe('pending');expect((await requestWorkspace(b.session,command(b.snapshot.version,'beta'),store,limited)).state).toBe('limited');
 });

 it('enforces the dispatch-day ceiling against prior-day backlog, concurrent jobs and a lowered cap',async()=>{
  const a=await verified('backlog-a@example.invalid'),b=await verified('backlog-b@example.invalid'),limited={...config,maxNewProjectsPerDay:1};
  await db.pool.query("CREATE FUNCTION nevora_onboarding.fixture_prior_day() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.created_at:=clock_timestamp()-interval '1 day'; RETURN NEW; END $$; CREATE TRIGGER fixture_prior_day BEFORE INSERT ON nevora_onboarding.provisioning_operations FOR EACH ROW EXECUTE FUNCTION nevora_onboarding.fixture_prior_day()");
  await requestWorkspace(a.session,command(a.snapshot.version,'backlog-alpha'),store,limited);await db.pool.query('DROP TRIGGER fixture_prior_day ON nevora_onboarding.provisioning_operations; DROP FUNCTION nevora_onboarding.fixture_prior_day()');expect((await requestWorkspace(b.session,command(b.snapshot.version,'backlog-beta'),store,limited)).state).toBe('pending');
  const provider=new OwnedProvisioningProvider();try{const leases=await Promise.all([claimProvisioningJob(store,limited),claimProvisioningJob(store,limited)]);expect(leases.every(Boolean)).toBe(true);const result=await Promise.all(leases.map(l=>runProvisioningJob(l!,{store,config:limited,provider,connect:provider.connect})));expect(result.map(x=>x.state).sort()).toEqual(['complete','pending']);expect(provider.createCalls).toBe(1);expect((await db.pool.query("SELECT count(*)::int n FROM nevora_onboarding.provisioning_attempts WHERE outcome<>'REJECTED'")).rows[0].n).toBe(1);
   await db.pool.query('UPDATE nevora_onboarding.provisioning_operations SET not_before=clock_timestamp()');const retry=await claimProvisioningJob(store,limited);expect(retry).not.toBeNull();expect((await runProvisioningJob(retry!,{store,config:limited,provider,connect:provider.connect})).state).toBe('pending');expect(provider.createCalls).toBe(1);
  }finally{await provider.close();}
 });
 it('recovers a lost create response using the original owned resource without another POST',async()=>{
  const a=await verified('owner-a@example.invalid'),c=command(a.snapshot.version);await requestWorkspace(a.session,c,store,config);const provider=new OwnedProvisioningProvider();provider.loseNextCreateResponse=true;
  try{const first=await claimProvisioningJob(store,config);expect(first).not.toBeNull();expect((await runProvisioningJob(first!,{store,config,provider,connect:provider.connect})).state).toBe('pending');
   await db.pool.query('UPDATE nevora_onboarding.provisioning_operations SET not_before=clock_timestamp()');const second=await claimProvisioningJob(store,config);expect((await runProvisioningJob(second!,{store,config,provider,connect:provider.connect})).state).toBe('complete');expect(provider.createCalls).toBe(1);expect(provider.resources.size).toBe(1);
   const company=[...provider.resources.values()][0];expect((await company.db.pool.query('SELECT id,active FROM employees')).rows).toEqual([{id:'OWNER-1',active:false}]);expect((await company.db.pool.query('SELECT count(*)::int n FROM onboarding_provision_receipts')).rows[0].n).toBe(1);
  }finally{await provider.close();}
 });
 it('recovers a lost company commit from its exact receipt without duplicate schema or credential writes',async()=>{
  const a=await verified('owner-a@example.invalid'),c=command(a.snapshot.version);await requestWorkspace(a.session,c,store,config);const provider=new OwnedProvisioningProvider();provider.loseNextBootstrapCommit=true;
  try{expect((await runProvisioningJob((await claimProvisioningJob(store,config))!,{store,config,provider,connect:provider.connect})).state).toBe('pending');await db.pool.query('UPDATE nevora_onboarding.provisioning_operations SET not_before=clock_timestamp()');expect((await runProvisioningJob((await claimProvisioningJob(store,config))!,{store,config,provider,connect:provider.connect})).state).toBe('complete');expect(provider.createCalls).toBe(1);const company=[...provider.resources.values()][0];expect((await company.db.pool.query('SELECT count(*)::int n FROM employee_credentials')).rows[0].n).toBe(0);
   const secret=(await db.pool.query('SELECT credentials_ciphertext,bootstrap_ciphertext FROM nevora_onboarding.provisioning_private')).rows[0];expect(JSON.stringify(secret)).not.toContain(company.uri);expect(JSON.stringify(secret)).not.toContain('fictional-owned-provisioner-password');
  }finally{await provider.close();}
 });
 it('retries an explicitly rejected429 create but never reuses a stale or fabricated worker lease',async()=>{
  const a=await verified('owner-a@example.invalid'),c=command(a.snapshot.version);await requestWorkspace(a.session,c,store,config);const provider=new OwnedProvisioningProvider();provider.rejectNextCreate=true;
  try{const old=await claimProvisioningJob(store,config);await db.pool.query("UPDATE nevora_onboarding.provisioning_operations SET lease_expires_at=clock_timestamp()-interval '1 second'");const current=await claimProvisioningJob(store,config);expect((await runProvisioningJob(old!,{store,config,provider,connect:provider.connect})).state).toBe('lease_lost');expect((await runProvisioningJob({} as never,{store,config,provider,connect:provider.connect})).state).toBe('lease_lost');expect(provider.createCalls).toBe(0);
   expect((await runProvisioningJob(current!,{store,config,provider,connect:provider.connect})).state).toBe('pending');await db.pool.query('UPDATE nevora_onboarding.provisioning_operations SET not_before=clock_timestamp()');expect((await runProvisioningJob((await claimProvisioningJob(store,config))!,{store,config,provider,connect:provider.connect})).state).toBe('complete');expect(provider.createCalls).toBe(2);expect(provider.resources.size).toBe(1);
  }finally{await provider.close();}
 });
 it('waits for a temporarily missing known-resource listing without quarantining or POSTing again',async()=>{
  const a=await verified('owner-a@example.invalid'),c=command(a.snapshot.version);await requestWorkspace(a.session,c,store,config);const provider=new OwnedProvisioningProvider();provider.loseNextBootstrapCommit=true;
  try{await runProvisioningJob((await claimProvisioningJob(store,config))!,{store,config,provider,connect:provider.connect});provider.hideNextLookup=true;await db.pool.query('UPDATE nevora_onboarding.provisioning_operations SET not_before=clock_timestamp()');expect((await runProvisioningJob((await claimProvisioningJob(store,config))!,{store,config,provider,connect:provider.connect})).state).toBe('pending');expect(provider.createCalls).toBe(1);expect((await db.pool.query('SELECT reason_code FROM nevora_onboarding.provisioning_operations')).rows[0].reason_code).toBe('RESOURCE_LOOKUP_UNAVAILABLE');
   await db.pool.query('UPDATE nevora_onboarding.provisioning_operations SET not_before=clock_timestamp()');expect((await runProvisioningJob((await claimProvisioningJob(store,config))!,{store,config,provider,connect:provider.connect})).state).toBe('complete');
  }finally{await provider.close();}
 });
 it('reports a lease lost during recovery instead of throwing or quarantining another worker job',async()=>{
  const a=await verified('owner-a@example.invalid'),c=command(a.snapshot.version);await requestWorkspace(a.session,c,store,config);const provider=new OwnedProvisioningProvider();provider.loseNextCreateResponse=true;
  try{await runProvisioningJob((await claimProvisioningJob(store,config))!,{store,config,provider,connect:provider.connect});provider.foreignLookup=true;provider.onFind=async()=>{await db.pool.query("UPDATE nevora_onboarding.provisioning_operations SET lease_expires_at=clock_timestamp()-interval '1 second'");};await db.pool.query('UPDATE nevora_onboarding.provisioning_operations SET not_before=clock_timestamp()');expect((await runProvisioningJob((await claimProvisioningJob(store,config))!,{store,config,provider,connect:provider.connect})).state).toBe('lease_lost');expect((await db.pool.query('SELECT state FROM nevora_onboarding.provisioning_operations')).rows[0].state).not.toBe('QUARANTINED');
  }finally{await provider.close();}
 });
 it('retries a transient read failure before any create intent without creating an ambiguous POST',async()=>{
  const a=await verified('owner-a@example.invalid'),c=command(a.snapshot.version);await requestWorkspace(a.session,c,store,config);const provider=new OwnedProvisioningProvider();provider.failNextLookup=true;
  try{expect((await runProvisioningJob((await claimProvisioningJob(store,config))!,{store,config,provider,connect:provider.connect})).state).toBe('pending');expect(provider.createCalls).toBe(0);expect((await db.pool.query('SELECT count(*)::int n FROM nevora_onboarding.provisioning_attempts')).rows[0].n).toBe(0);
   await db.pool.query('UPDATE nevora_onboarding.provisioning_operations SET not_before=clock_timestamp()');expect((await runProvisioningJob((await claimProvisioningJob(store,config))!,{store,config,provider,connect:provider.connect})).state).toBe('complete');expect(provider.createCalls).toBe(1);
  }finally{await provider.close();}
 });
 it('does not POST after losing the acknowledgement of the durable create intent',async()=>{
  const a=await verified('owner-a@example.invalid'),c=command(a.snapshot.version);await requestWorkspace(a.session,c,store,config);const provider=new OwnedProvisioningProvider();let lost=false;
  const uncertain:ControlStore={query:(...args)=>store.query(...args),async transaction(work){const result=await store.transaction(work);if(!lost&&(await db.pool.query("SELECT 1 FROM nevora_onboarding.provisioning_attempts WHERE outcome='PENDING'")).rowCount){lost=true;throw new ControlCommitUnknown();}return result;}};
  try{expect((await runProvisioningJob((await claimProvisioningJob(uncertain,config))!,{store:uncertain,config,provider,connect:provider.connect})).state).toBe('pending');expect(provider.createCalls).toBe(0);await db.pool.query('UPDATE nevora_onboarding.provisioning_operations SET not_before=clock_timestamp()');expect((await runProvisioningJob((await claimProvisioningJob(uncertain,config))!,{store:uncertain,config,provider,connect:provider.connect})).state).toBe('pending');expect(provider.createCalls).toBe(0);expect(provider.resources.size).toBe(0);
  }finally{await provider.close();}
 });
 it('recovers lost acknowledgements after resource publication and final control publication',async()=>{
  const a=await verified('owner-a@example.invalid'),c=command(a.snapshot.version);await requestWorkspace(a.session,c,store,config);const provider=new OwnedProvisioningProvider();let resourceLost=false,publishLost=false;
  const uncertain:ControlStore={async query<R extends QueryResultRow>(sql:string,values?:readonly unknown[]){const result=await store.query<R>(sql,values);if(!resourceLost&&sql.includes("SET resource=$3::jsonb,state='RESOURCE_READY'")){resourceLost=true;throw new ControlCommitUnknown();}return result;},async transaction(work){const result=await store.transaction(work);if(!publishLost&&(await db.pool.query("SELECT 1 FROM nevora_onboarding.provisioning_operations WHERE state='OWNER_ACTIVATION_REQUIRED'")).rowCount){publishLost=true;throw new ControlCommitUnknown();}return result;}};
  try{expect((await runProvisioningJob((await claimProvisioningJob(uncertain,config))!,{store:uncertain,config,provider,connect:provider.connect})).state).toBe('pending');await db.pool.query('UPDATE nevora_onboarding.provisioning_operations SET not_before=clock_timestamp()');expect((await runProvisioningJob((await claimProvisioningJob(uncertain,config))!,{store:uncertain,config,provider,connect:provider.connect})).state).toBe('complete');expect(resourceLost&&publishLost).toBe(true);expect(provider.createCalls).toBe(1);expect((await db.pool.query('SELECT count(*)::int n FROM nevora_onboarding.workspace_secrets')).rows[0].n).toBe(2);expect(await claimProvisioningJob(uncertain,config)).toBeNull();
  }finally{await provider.close();}
 });
 it('bootstraps two independent businesses concurrently with the same local Owner ID',async()=>{
  const a=await verified('owner-a@example.invalid'),b=await verified('owner-b@example.invalid');await Promise.all([requestWorkspace(a.session,command(a.snapshot.version,'alpha'),store,config),requestWorkspace(b.session,command(b.snapshot.version,'beta'),store,config)]);const provider=new OwnedProvisioningProvider();
  try{const leases=await Promise.all([claimProvisioningJob(store,config),claimProvisioningJob(store,config)]);expect(leases.every(Boolean)).toBe(true);const results=await Promise.all(leases.map(l=>runProvisioningJob(l!,{store,config,provider,connect:provider.connect})));expect(results.map(r=>r.state)).toEqual(['complete','complete']);expect(provider.resources.size).toBe(2);const emails=[];for(const company of provider.resources.values()){const people=(await company.db.pool.query('SELECT id,email FROM employees')).rows;expect(people.map(p=>p.id)).toEqual(['OWNER-1']);emails.push(people[0].email);}expect(emails.sort()).toEqual(['owner-a@example.invalid','owner-b@example.invalid']);
  }finally{await provider.close();}
 });
 it('quarantines foreign recovery metadata instead of touching its database',async()=>{
  const a=await verified('owner-a@example.invalid'),c=command(a.snapshot.version);await requestWorkspace(a.session,c,store,config);const provider=new OwnedProvisioningProvider();provider.loseNextCreateResponse=true;
  try{await runProvisioningJob((await claimProvisioningJob(store,config))!,{store,config,provider,connect:provider.connect});provider.foreignLookup=true;await db.pool.query('UPDATE nevora_onboarding.provisioning_operations SET not_before=clock_timestamp()');expect((await runProvisioningJob((await claimProvisioningJob(store,config))!,{store,config,provider,connect:provider.connect})).state).toBe('quarantined');const company=[...provider.resources.values()][0];expect((await company.db.pool.query("SELECT count(*)::int n FROM pg_tables WHERE schemaname='public'")).rows[0].n).toBe(0);expect(provider.createCalls).toBe(1);
  }finally{await provider.close();}
 });

 it('recovers an actual killed worker after resource creation without a second provider create',async()=>{
  const {spawn}=await import('node:child_process');const {resolve}=await import('node:path');const a=await verified('owner-a@example.invalid'),c=command(a.snapshot.version);await requestWorkspace(a.session,c,store,config);const provider=new OwnedProvisioningProvider();
  const child=spawn(process.execPath,['--conditions=react-server','--import',resolve('scripts/node-server-context.mjs'),'--import','tsx',resolve('src/test/integration/onboarding-provisioning-child.mts')],{cwd:process.cwd(),env:{PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:process.env.TMPDIR,NODE_ENV:'test',NEVORA_ONBOARDING_TEST_CUSTODY:process.env.NEVORA_ONBOARDING_TEST_CUSTODY},stdio:['ignore','ignore','ignore','ipc']});
  const exited=new Promise<{code:number|null;signal:NodeJS.Signals|null}>((ok,bad)=>{child.once('error',bad);child.once('exit',(code,signal)=>ok({code,signal}));});let killed=false;const deadline=setTimeout(()=>child.kill('SIGKILL'),8000);
  child.on('message',async value=>{
   const m=value as {kind:string;id:number;method:string;args:unknown[]};
   if(m.kind==='ready'){child.send({kind:'start',controlUrl:db.connectionUrl,config});return;}
   if(m.kind==='child_failed'||m.kind==='unexpected_completion'){child.kill('SIGTERM');return;}
   if(m.kind!=='provider')return;
   try{
    if(m.method==='find')child.send({kind:'reply',id:m.id,result:await provider.find(m.args[0] as never,m.args[1] as never)});
    else if(m.method==='create'){await provider.create(m.args[0] as never,m.args[1] as never);killed=child.kill('SIGKILL');}
    else child.kill('SIGTERM');
   }catch{child.kill('SIGTERM');}
  });
  try{const outcome=await exited;expect(killed).toBe(true);expect(outcome.signal).toBe('SIGKILL');expect(provider.createCalls).toBe(1);expect((await db.pool.query("SELECT outcome FROM nevora_onboarding.provisioning_attempts")).rows[0].outcome).toBe('PENDING');
   await db.pool.query("UPDATE nevora_onboarding.provisioning_operations SET lease_expires_at=clock_timestamp()-interval '1 second',not_before=clock_timestamp()");const lease=await claimProvisioningJob(store,config);expect((await runProvisioningJob(lease!,{store,config,provider,connect:provider.connect})).state).toBe('complete');expect(provider.createCalls).toBe(1);expect(provider.resources.size).toBe(1);
  }finally{clearTimeout(deadline);if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');await exited.catch(()=>undefined);await provider.close();}
 });

});
