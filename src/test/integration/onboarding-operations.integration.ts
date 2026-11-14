import {it,expect} from 'vitest';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import type {SqlExecutor,SqlStatement} from '@/lib/notifications/types';
import {Client} from 'pg';
import {onboardingJourneyFixture} from './onboarding-journey-fixture';
import {suspendOnboardingWorkspace,retireRestoredCompany} from '@/lib/onboarding/operations.server';
import {resolveWorkspaceBinding} from '@/lib/workspace-routing/resolver.server';
import {getWorkspaceDb} from '@/lib/workspace-routing/transport.server';
import {ControlCommitUnknown,type ControlStore} from '@/lib/onboarding/control-store.server';
async function ready(){const f=await onboardingJourneyFixture();try{const a=await f.activateCompany(await f.createCompany());const registry=(await f.db.pool.query('SELECT id,revision::text,incarnation::text FROM nevora_onboarding.workspace_registry')).rows[0];return {...f,...a,registry,command:{operationId:randomUUID(),workspaceId:registry.id,fromIncarnation:registry.incarnation}};}catch(error){await f.close();throw error;}}
it('requires actual suspended control custody and never modifies another company',async()=>{
 const f=await ready();try{const b=await f.activateCompany(await f.createCompany('beta','b@example.invalid'));expect((await retireRestoredCompany(f.store,f.config,f.command,f.provider.connect)).state).toBe('unavailable');expect((await suspendOnboardingWorkspace(f.store,f.config,{workspaceId:f.registry.id,expectedRevision:'0'})).state).toBe('unavailable');expect((await suspendOnboardingWorkspace(f.store,f.config,{workspaceId:f.registry.id,expectedRevision:f.registry.revision})).state).toBe('suspended');await expect(resolveWorkspaceBinding({origin:f.c.origin},f.store,f.routing)).rejects.toThrow();
  const wrong=async()=>{const client=new Client({connectionString:b.c.resource.uri});await client.connect();return {client,close:()=>client.end()};};expect((await retireRestoredCompany(f.store,f.config,f.command,wrong)).state).toBe('unavailable');expect((await b.c.resource.db.pool.query('SELECT incarnation::text,lifecycle FROM onboarding_workspace_identity')).rows[0]).toEqual({incarnation:'1',lifecycle:'ACTIVE'});expect((await getWorkspaceDb(b.binding).query<{id:string}>({text:'SELECT id FROM employees',values:[]}))[0].id).toBe('OWNER-1');
 }finally{await f.close();}
});
it('retires native challenges, private material, worker jobs and runtime credentials, preserving business data and suspension',async()=>{
 const f=await ready();try{const db=f.c.resource.db.pool,workspaceId=f.registry.id,installation=randomUUID(),generation=randomUUID(),notice=randomUUID(),now=new Date(),expires=new Date(now.getTime()+120000);const before=(await db.query('SELECT id,first_name,last_name,email,role,active,primary_location_id FROM employees ORDER BY id')).rows;
  await db.query("INSERT INTO notifications(id,employee_id,type,title,body,event_key,environment,source_kind,source_id,source_version,effective_version,purpose,due_at,expires_at,urgency,push_state) VALUES($1,'OWNER-1','SELF_TEST','Fictional','Open NEVORA',$1,'test','SELF_TEST',$1,'1','1','TEST',clock_timestamp(),clock_timestamp()+interval '1 hour','normal','pending')",[notice]);
  await db.query("INSERT INTO native_push_installations(id,workspace_id,employee_id,session_hash,origin,environment,platform,app_id,provider,key_fingerprint,public_key,generation,token_fingerprint,encrypted_material,status,consent_at) VALUES($1,$2,'OWNER-1',$3,$4,'test','ios','app.nevora.test','apns-sandbox',repeat('a',64),'fictional-owned-key',$5,repeat('b',64),'fictional-private-material','active',clock_timestamp())",[installation,workspaceId,f.actor.sessionTokenHash,f.c.origin,generation]);
  await db.query("INSERT INTO native_push_challenges(id,operation_id,workspace_id,employee_id,session_hash,origin,environment,key_fingerprint,public_key,wire,issued_at,expires_at) VALUES($1,$2,$3,'OWNER-1',$4,$5,'test',repeat('a',64),'fictional-owned-key','{}'::jsonb,$6,$7)",[randomUUID(),randomUUID(),workspaceId,f.actor.sessionTokenHash,f.c.origin,now.toISOString(),expires.toISOString()]);
  await db.query("INSERT INTO native_push_deliveries(notification_id,installation_id,generation,status,next_attempt_at,expires_at,lease_token,lease_expires_at) VALUES($1,$2,$3,'processing',clock_timestamp(),clock_timestamp()+interval '1 hour',$4,clock_timestamp()+interval '2 minutes')",[notice,installation,generation,randomUUID()]);
  await db.query("INSERT INTO payroll_jobs(id,workspace_id,kind,business_key,status,payload,lease_token,lease_until) VALUES($1,$2,'PREPARE','fictional-owned-job','RUNNING','{}'::jsonb,$3,clock_timestamp()+interval '2 minutes')",[randomUUID(),workspaceId,randomUUID()]);
  await db.query("INSERT INTO auth_passkey_challenges(token_hash,purpose,challenge) VALUES(repeat('c',64),'login','fictional-owned-challenge')");
  await suspendOnboardingWorkspace(f.store,f.config,{workspaceId,expectedRevision:f.registry.revision});expect(await retireRestoredCompany(f.store,f.config,f.command,f.provider.connect)).toEqual({state:'retired',incarnation:'2'});
  expect((await db.query('SELECT id,first_name,last_name,email,role,active,primary_location_id FROM employees ORDER BY id')).rows).toEqual(before);expect((await db.query('SELECT count(*)::int n FROM employee_sessions')).rows[0].n).toBe(0);expect((await db.query('SELECT count(*)::int n FROM native_push_challenges')).rows[0].n).toBe(0);expect((await db.query('SELECT count(*)::int n FROM auth_passkey_challenges')).rows[0].n).toBe(0);
  expect((await db.query('SELECT status,encrypted_material,token_fingerprint FROM native_push_installations')).rows).toEqual([{status:'detached',encrypted_material:null,token_fingerprint:null}]);expect((await db.query('SELECT status,lease_token FROM native_push_deliveries')).rows).toEqual([{status:'cancelled',lease_token:null}]);expect((await db.query('SELECT status,lease_token FROM payroll_jobs')).rows).toEqual([{status:'FAILED',lease_token:null}]);expect((await db.query('SELECT lifecycle,incarnation::text FROM onboarding_workspace_identity')).rows[0]).toEqual({lifecycle:'SUSPENDED',incarnation:'2'});expect((await f.db.pool.query('SELECT lifecycle,incarnation::text FROM nevora_onboarding.workspace_registry')).rows[0]).toEqual({lifecycle:'SUSPENDED',incarnation:'2'});expect((await f.db.pool.query('SELECT active FROM nevora_onboarding.workspace_secrets')).rows.every(r=>r.active===false)).toBe(true);expect((await db.query("SELECT rolcanlogin FROM pg_roles WHERE rolname=$1",[f.c.resource.identity.appRole])).rows[0].rolcanlogin).toBe(false);await expect(getWorkspaceDb(f.binding).query({text:'SELECT id FROM employees',values:[]})).rejects.toThrow();await expect(f.c.appPool.query('SELECT * FROM onboarding_restore_receipts')).rejects.toMatchObject({code:'42501'});
 }finally{await f.close();}
});
it('reconciles lost company and control commit acknowledgements with the original restore receipt, never resetting credentials twice',async()=>{
 for(const boundary of ['company','control']){const f=await ready();try{await suspendOnboardingWorkspace(f.store,f.config,{workspaceId:f.registry.id,expectedRevision:f.registry.revision});let lost=false;const uncertain:ControlStore={query:(...a)=>f.store.query(...a),async transaction(work){const value=await f.store.transaction(work);if(!lost){lost=true;throw new ControlCommitUnknown();}return value;}};if(boundary==='company')f.provider.loseNextBootstrapCommit=true;const store=boundary==='company'?f.store:uncertain;expect((await retireRestoredCompany(store,f.config,f.command,f.provider.connect)).state).toBe('outcome_unknown');const hash=(await f.c.resource.db.pool.query('SELECT password_hash FROM employee_credentials')).rows[0].password_hash;expect(await retireRestoredCompany(f.store,f.config,f.command,f.provider.connect)).toEqual({state:'retired',incarnation:'2'});expect((await f.c.resource.db.pool.query('SELECT password_hash FROM employee_credentials')).rows[0].password_hash).toBe(hash);expect((await f.c.resource.db.pool.query('SELECT count(*)::int n FROM onboarding_restore_receipts')).rows[0].n).toBe(1);expect((await retireRestoredCompany(f.store,f.config,{...f.command,operationId:randomUUID()},f.provider.connect)).state).toBe('unavailable');}finally{await f.close();}}
});
it('runs actual registration/provisioning/activation using separate restricted control principals without exposing bootstrap custody to the web role',async()=>{
 const f=await onboardingJourneyFixture({restrictedControl:true});try{const a=await f.activateCompany(await f.createCompany());expect(a.actor.employee.role).toBe('OWNER');await expect(f.store.query('SELECT bootstrap_ciphertext FROM nevora_onboarding.provisioning_private')).rejects.toMatchObject({code:'42501'});await expect(f.store.query("UPDATE nevora_onboarding.workspace_registry SET lifecycle='ACTIVE',revision=revision+1")).rejects.toMatchObject({code:'42501'});await expect(f.store.query("UPDATE nevora_onboarding.provisioning_operations SET state='ACTIVATED'")).rejects.toMatchObject({code:'42501'});expect((await f.provisionerStore.query('SELECT bootstrap_ciphertext IS NOT NULL AS present FROM nevora_onboarding.provisioning_private')).rows[0].present).toBe(true);const roles=(await f.db.pool.query('SELECT rolname,rolsuper,rolcreatedb,rolcreaterole,rolinherit,rolbypassrls FROM pg_roles WHERE rolname=ANY($1::text[])',[f.principals!.roles])).rows;expect(roles).toHaveLength(2);expect(roles.every(r=>!r.rolsuper&&!r.rolcreatedb&&!r.rolcreaterole&&!r.rolinherit&&!r.rolbypassrls)).toBe(true);
 }finally{await f.close();}
});
it('retires expired encrypted bearers under the restricted provisioner while preserving tombstones and current material',async()=>{
 const {cleanupOnboardingControl}=await import('@/lib/onboarding/cleanup.server');const f=await onboardingJourneyFixture({restrictedControl:true});try{const a=await f.activateCompany(await f.createCompany()),registration=(await f.db.pool.query('SELECT id FROM nevora_onboarding.registrations')).rows[0].id,old=randomUUID();await f.db.pool.query("INSERT INTO nevora_onboarding.owner_grant_requests(operation_id,registration_id,workspace_id,incarnation,token_digest,token_ciphertext,state,created_at,expires_at) VALUES($1,$2,$3,1,repeat('d',64),'fictional-old-encrypted-bearer','REVOKED',clock_timestamp()-interval '26 hours',clock_timestamp()-interval '25 hours')",[old,registration,a.c.row.workspace_id]);const before=(await f.db.pool.query('SELECT operation_id,token_ciphertext FROM nevora_onboarding.owner_grant_requests WHERE operation_id<>$1',[old])).rows;const result=await cleanupOnboardingControl(f.provisionerStore,f.config);expect(result.retiredCiphertexts).toBe(1);expect((await f.db.pool.query('SELECT token_ciphertext,state FROM nevora_onboarding.owner_grant_requests WHERE operation_id=$1',[old])).rows[0]).toEqual({token_ciphertext:'',state:'REVOKED'});expect((await f.db.pool.query('SELECT operation_id,token_ciphertext FROM nevora_onboarding.owner_grant_requests WHERE operation_id<>$1',[old])).rows).toEqual(before);expect((await cleanupOnboardingControl(f.provisionerStore,f.config)).retiredCiphertexts).toBe(0);await expect(f.db.pool.query("UPDATE nevora_onboarding.owner_grant_requests SET token_ciphertext='revive' WHERE operation_id=$1",[old])).rejects.toThrow('owner_grant_ciphertext_immutable');
 }finally{await f.close();}
});
it('restores the original signed passkey without re-enrollment, then retires the image before registry reactivation',async()=>{
 const {spawnSync}=await import('node:child_process');
 const {mkdtempSync,rmSync,chmodSync,statSync,readFileSync}=await import('node:fs');
 const {tmpdir}=await import('node:os');
 const {join,resolve}=await import('node:path');
 const {verifyPassword,hashPassword}=await import('@/lib/auth/password');
 const {PasskeyService}=await import('@/lib/auth/passkeys/service.server');
 const {fictionalAuthenticator}=await import('./passkey-authenticator.test-support');
 const f=await ready(),directory=mkdtempSync(join(tmpdir(),'nv-onboarding-backup-'));
 try{
  const db=f.c.resource.db.pool;
  const executor:SqlExecutor={
   async query<T>(query:SqlStatement){return (await db.query(query.text,[...query.values])).rows as T[];},
   async transaction(statements){
    const client=await db.connect();
    try{await client.query('BEGIN');const rows:unknown[][]=[];
     for(const statement of statements)rows.push((await client.query(statement.text,[...statement.values])).rows);
     await client.query('COMMIT');return rows;
    }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
   },
  };
  const flow=()=>randomBytes(32).toString('base64url');
  const config={rpID:'localhost',origin:'http://localhost:3000'};
  const originalSigner=fictionalAuthenticator(),service=new PasskeyService(config,executor),registrationToken=flow();
  const registration=await service.registrationOptions(f.actor,registrationToken);
  await service.register(f.actor,registrationToken,originalSigner.register(registration.challenge,config.origin,config.rpID),'Fictional pre-backup key');
  const beforeToken=flow(),beforeOptions=await service.loginOptions(beforeToken);
  await service.login(beforeToken,originalSigner.authenticate(beforeOptions.challenge,registration.user.id,1,config.origin,config.rpID));
  const originalCredentials=(await db.query('SELECT * FROM employee_passkeys ORDER BY id')).rows;
  const originalHandles=(await db.query('SELECT * FROM auth_passkey_users ORDER BY employee_id')).rows;
  expect(originalCredentials).toHaveLength(1);
  expect(originalCredentials[0].credential_id).toBe(originalSigner.id);
  expect(Number(originalCredentials[0].sign_counter)).toBe(1);
  const identityDigest=(row:Record<string,unknown>)=>createHash('sha256').update(JSON.stringify({id:row.id,credentialId:row.credential_id,publicKey:row.public_key})).digest('hex');
  const originalIdentitySha256=identityDigest(originalCredentials[0]);
  expect((await db.query("SELECT event FROM auth_passkey_audit ORDER BY created_at,id")).rows).toEqual([{event:'register'},{event:'sign_in'}]);
  await db.query("INSERT INTO auth_passkey_challenges(token_hash,purpose,challenge) VALUES(repeat('e',64),'login','fictional-before-backup')");
  await db.query("INSERT INTO clocker_pin_limits(scope,scope_id,failures) VALUES('PERSON','OWNER-1',5)");
  const pinBudget=(await db.query("SELECT * FROM clocker_pin_limits WHERE scope='PERSON' AND scope_id='OWNER-1'")).rows;
  const url=new URL(f.c.resource.db.connectionUrl);
  const env={NODE_ENV:'test' as const,PATH:process.env.PATH,PGHOST:url.hostname,PGPORT:url.port,PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),PGDATABASE:decodeURIComponent(url.pathname.slice(1))};
  const bin=process.env.NEVORA_TEST_PG_CLIENT_BIN??process.env.NEVORA_TEST_PG_BIN??resolve('.superpowers/sdd/2026-11-07-self-service-owner-onboarding/tools/postgres17/package/native/bin');
  const file=join(directory,'owned.dump');
  const dump=spawnSync(join(bin,'pg_dump'),['--format=custom','--file',file],{env,encoding:'utf8',timeout:15000});
  if(dump.status!==0)throw Error('Owned pg_dump failed:'+String(dump.status));
  chmodSync(file,0o600);
  expect(statSync(file).mode&0o777).toBe(0o600);
  expect(readFileSync(file).subarray(0,5).toString()).toBe('PGDMP');
  const toc=spawnSync(join(bin,'pg_restore'),['--list',file],{env,encoding:'utf8',timeout:15000});
  expect(toc.status).toBe(0);
  expect(toc.stdout).toMatch(/TABLE DATA public employee_passkeys /);
  expect(toc.stdout).toMatch(/TABLE DATA public auth_passkey_users /);
  const archiveSha256=createHash('sha256').update(readFileSync(file)).digest('hex');
  await db.query("UPDATE employees SET first_name='Changed after backup' WHERE id='OWNER-1'");
  await db.query('DELETE FROM employee_sessions;DELETE FROM auth_passkey_challenges');
  await db.query('UPDATE employee_credentials SET password_hash=$1',[await hashPassword('Fictional changed password 123!')]);
  await db.query("DELETE FROM clocker_pin_limits WHERE scope='PERSON' AND scope_id='OWNER-1'");
  await suspendOnboardingWorkspace(f.store,f.config,{workspaceId:f.registry.id,expectedRevision:f.registry.revision});
  const restored=spawnSync(join(bin,'pg_restore'),['--clean','--if-exists','--exit-on-error','--dbname',env.PGDATABASE,file],{env,encoding:'utf8',timeout:15000});
  if(restored.status!==0)throw Error('Owned pg_restore failed');
  expect((await db.query("SELECT * FROM clocker_pin_limits WHERE scope='PERSON' AND scope_id='OWNER-1'")).rows).toEqual(pinBudget);
  expect((await db.query("SELECT first_name FROM employees WHERE id='OWNER-1'")).rows[0].first_name).toBe('Fictional');
  expect((await db.query('SELECT count(*)::int n FROM employee_sessions')).rows[0].n).toBe(2);
  expect((await db.query('SELECT count(*)::int n FROM auth_passkey_challenges')).rows[0].n).toBe(1);
  const restoredCredentials=(await db.query('SELECT * FROM employee_passkeys ORDER BY id')).rows;
  expect(restoredCredentials).toEqual(originalCredentials);
  const restoredIdentitySha256=identityDigest(restoredCredentials[0]);
  expect((await db.query('SELECT * FROM auth_passkey_users ORDER BY employee_id')).rows).toEqual(originalHandles);

  // Keep the pre-backup signer/handle. No registration or fixture replacement occurs after restore.
  const restoredService=new PasskeyService(config,executor),token=flow();
  const options=await restoredService.loginOptions(token);
  const response=originalSigner.authenticate(options.challenge,registration.user.id,2,config.origin,config.rpID);
  const session=await restoredService.login(token,response);
  expect((await db.query('SELECT employee_id FROM employee_sessions WHERE token_hash=$1',[session.tokenHash])).rows).toEqual([{employee_id:'OWNER-1'}]);
  await expect(restoredService.login(token,response)).rejects.toMatchObject({code:'not_found'});
  const repeatedToken=flow(),repeatedOptions=await restoredService.loginOptions(repeatedToken);
  await expect(restoredService.login(repeatedToken,originalSigner.authenticate(repeatedOptions.challenge,registration.user.id,2,config.origin,config.rpID))).rejects.toMatchObject({code:'not_found'});
  const wrongToken=flow(),wrongOptions=await restoredService.loginOptions(wrongToken);
  const wrongResponse=fictionalAuthenticator().authenticate(wrongOptions.challenge,registration.user.id,3,config.origin,config.rpID);
  wrongResponse.id=originalSigner.id;wrongResponse.rawId=originalSigner.id;
  await expect(restoredService.login(wrongToken,wrongResponse)).rejects.toMatchObject({code:'not_found'});
  expect((await db.query('SELECT count(*)::int n FROM employee_sessions')).rows[0].n).toBe(3);
  expect((await db.query('SELECT id,credential_id,sign_counter FROM employee_passkeys')).rows).toEqual([{id:originalCredentials[0].id,credential_id:originalSigner.id,sign_counter:'2'}]);
  expect((await db.query("SELECT event FROM auth_passkey_audit WHERE event='register'")).rows).toEqual([{event:'register'}]);
  expect((await db.query("SELECT count(*)::int n FROM auth_passkey_audit WHERE event='sign_in'")).rows[0].n).toBe(2);
  expect((await f.db.pool.query('SELECT lifecycle FROM nevora_onboarding.workspace_registry')).rows[0].lifecycle).toBe('SUSPENDED');

  expect(await retireRestoredCompany(f.store,f.config,f.command,f.provider.connect)).toEqual({state:'retired',incarnation:'2'});
  expect((await db.query('SELECT count(*)::int n FROM employee_sessions')).rows[0].n).toBe(0);
  expect((await db.query('SELECT count(*)::int n FROM auth_passkey_challenges')).rows[0].n).toBe(0);
  const hash=(await db.query('SELECT password_hash FROM employee_credentials')).rows[0].password_hash;
  expect(await verifyPassword('Fictional owner password 123!',hash)).toBe(false);
  expect((await f.db.pool.query('SELECT lifecycle FROM nevora_onboarding.workspace_registry')).rows[0].lifecycle).toBe('SUSPENDED');
  console.info('RESTORE_ORIGINAL_KEY',JSON.stringify({
   schemaVersion:1,scope:'owned-loopback-only',sourceSha:spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim(),
   testSourceSha256:createHash('sha256').update(readFileSync('src/test/integration/onboarding-operations.integration.ts')).digest('hex'),
   archiveBytes:statSync(file).size,archiveSha256,archiveMode:'0600',archiveFormat:'PGDMP',
   dumpVersion:spawnSync(join(bin,'pg_dump'),['--version'],{encoding:'utf8'}).stdout.trim(),
   restoreVersion:spawnSync(join(bin,'pg_restore'),['--version'],{encoding:'utf8'}).stdout.trim(),
   serverVersion:(await db.query('SHOW server_version')).rows[0].server_version,
   originalIdentitySha256,restoredIdentitySha256,
   counterBeforeRestore:1,counterAfterOriginalKeyLogin:2,postRestoreEnrollments:0,
   originalSignerRetainedInMemory:true,privateSignerExported:false,originalKeyLogin:true,
   assertionReplayDenied:true,repeatedCounterDenied:true,wrongSignatureDenied:true,
   retiredBeforeRegistryReactivation:true,providersUsed:false,
  }));
 }finally{rmSync(directory,{recursive:true,force:true});await f.close();}
});
